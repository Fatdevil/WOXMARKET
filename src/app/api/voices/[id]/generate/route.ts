import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasActiveVoiceAccess } from '@/lib/access';
import { getUsageStatus } from '@/lib/usage';
import { uploadBuffer, getPublicUrl } from '@/lib/storage';
import { stripe } from '@/lib/stripe';
import crypto from 'crypto';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    let user = session?.user as any;

    // --- TEST HOOK: SCRIPT AUTH BYPASS ---
    if (
       process.env.NODE_ENV !== 'production' && 
       process.env.ENABLE_TEST_FAILURE_HOOKS === 'true' && 
       req.headers.get('x-test-secret') === 'vox_super_test_secret' &&
       req.headers.get('x-test-user-id')
    ) {
         user = { id: req.headers.get('x-test-user-id') };
    }

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized (Login required)' }, { status: 401 });
    }

    const voiceId = resolvedParams.id;
    const body = await req.json();
    const textToGenerate = body.text || '';
    const requestedLength = textToGenerate.length;

    // 1. INPUT LIMIT ENFORCEMENT
    if (requestedLength === 0) {
      return NextResponse.json({ error: 'Text payload cannot be empty' }, { status: 400 });
    }
    if (requestedLength > 2000) {
      return NextResponse.json({ error: `Payload too large. Maximum 2000 characters per request. Requested: ${requestedLength}` }, { status: 413 });
    }

    // 2. BACKEND ENFORCEMENT & GATE
    const authorized = await hasActiveVoiceAccess(user.id, voiceId);
    if (!authorized) {
      return NextResponse.json({ 
        error: 'Forbidden. Active subscription required to use this voice.' 
      }, { status: 403 });
    }

    // 3. Fetch voice to identify subscription Tier and ElevenLabs data
    const voice = await prisma.voice.findUnique({
      where: { id: voiceId }
    });

    if (!voice) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
    }

    // 4. USAGE CAP COMPUTATION & CEILING (HTTP 429)
    const usageObj = await getUsageStatus(user.id, voiceId, voice.subscriptionPrice);
    
    // Safety check BEFORE generating audio – never allow runaway processing
    if (usageObj.absoluteCeilingReached || (usageObj.usedTotal + requestedLength > usageObj.absoluteCeiling)) {
       return NextResponse.json({ 
         error: 'absolute_ceiling_reached',
         message: `You have reached the absolute hard-limit of ${usageObj.absoluteCeiling.toLocaleString()} characters for this billing cycle to protect your account. Please wait until the next cycle.`
       }, { status: 429 });
    }
    
    // Determine the billing bucket for this attempt up front
    const isThisRequestOverage = (usageObj.usedTotal + requestedLength) > usageObj.includedLimit;
    const bucketMarking = isThisRequestOverage ? 'overage' : 'included';

    const elevenLabsVoiceId = voice.modelVersion || 'pNInz6obpgDQGcFmaJcg'; // Fallback Adam

    // 3. GENERATE (Eleven Labs actual call handling)
    const apiKey = process.env.ELEVENLABS_API_KEY;
    let audioBuffer: any;

    if (!apiKey) {
      // Real-life we would send `text` to ElevenLabs API and get an Audio Buffer back
      // Example MVP: fetch mock stream just to get a valid MP3 buffer
      const mockAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      // --- TEST HOOK: TTS FAILURE ---
      if (
         process.env.NODE_ENV !== 'production' && 
         process.env.ENABLE_TEST_FAILURE_HOOKS === 'true' && 
         req.headers.get('x-test-secret') === 'vox_super_test_secret' && 
         req.headers.get('x-test-force-tts-fail') === 'true'
      ) {
         throw new Error('test_tts_failure');
      }

      const responseStream = await fetch(mockAudioUrl);
      const audioArrayBuffer = await responseStream.arrayBuffer();
      audioBuffer = Buffer.from(audioArrayBuffer);

      // Upload generated TTS to R2
      const uuid = crypto.randomUUID();
      const storageKey = `voices/${voiceId}/generated/${uuid}.mp3`;
      await uploadBuffer(Buffer.from(audioBuffer), storageKey, 'audio/mpeg');

      // Ensure stable public url
      const finalAudioUrl = getPublicUrl(storageKey);

      // Log Generated Data for cost auditing and future playback
      await prisma.generatedAudio.create({
        data: {
          voiceId: voice.id,
          userId: user.id,
          storageKey: storageKey,
          url: finalAudioUrl,
          characters: requestedLength
        }
      });
      
      // Fallback response for dev environments without ElevenLabs API Key
      // StudioGenerator expects the raw MP3 byte stream, not JSON.
      // 4. USAGE LOGGING & STRIPE METERING (for overage)
      if (bucketMarking === 'overage') {
         // Requires querying the active sub for stripeMeteredItemId
         const activeSub = await prisma.subscription.findFirst({
            where: { buyerUserId: user.id, voiceId: voice.id, status: 'active' },
            select: { stripeMeteredItemId: true }
         });

         if (activeSub?.stripeMeteredItemId) {
            try {
               // --- TEST HOOK: STRIPE FAILURE ---
               if (
                 process.env.NODE_ENV !== 'production' && 
                 process.env.ENABLE_TEST_FAILURE_HOOKS === 'true' && 
                 req.headers.get('x-test-secret') === 'vox_super_test_secret'
               ) {
                 if (req.headers.get('x-test-force-stripe-fail') === 'true') {
                    throw new Error('test_stripe_failure');
                 }
                 // Mock success for automated test suite to bypass need for live Stripe key
                 console.log('[TEST] Mocked Stripe Usage Record Creation');
               } else {
                 await (stripe.subscriptionItems as any).createUsageRecord(
                   activeSub.stripeMeteredItemId,
                   {
                     quantity: requestedLength,
                     timestamp: Math.floor(Date.now() / 1000),
                     action: 'increment',
                   },
                   { idempotencyKey: `usage_${uuid}` } 
                 );
               }
            } catch (stripeErr) {
               console.error('Failed to log Stripe Overage Usage:', stripeErr);
               // Fails Closed: We must throw and prevent finalizing the transaction if overage breaks.
               throw new Error('stripe_billing_error');
            }
         }
      }

      await prisma.usageEvent.create({
        data: {
          buyerUserId: user.id,
          voiceId: voice.id,
          eventType: 'paid_generation',
          usageAmount: textToGenerate.length,
          unit: 'characters',
          billingBucket: bucketMarking,
          source: 'app_studio'
        }
      });

      // 5. INTERNAL AUDIT TRAIL
      console.log(JSON.stringify({
         __audit: true,
         requestId: uuid,
         userId: user.id,
         voiceId: voice.id,
         characterCount: requestedLength,
         usageBefore: usageObj.usedTotal,
         usageAfter: usageObj.usedTotal + requestedLength,
         billingBucket: bucketMarking,
         withinIncluded: !isThisRequestOverage,
         ttsSuccess: true,
         stripeMeteredSuccess: bucketMarking === 'overage' ? true : null,
         blockedBy: 'none'
      }));

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'X-VoxMarket-Audio-Url': finalAudioUrl
        },
      });
    } else {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: textToGenerate,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      // --- TEST HOOK: TTS FAILURE ---
      if (
         process.env.NODE_ENV !== 'production' && 
         process.env.ENABLE_TEST_FAILURE_HOOKS === 'true' && 
         req.headers.get('x-test-secret') === 'vox_super_test_secret' && 
         req.headers.get('x-test-force-tts-fail') === 'true'
      ) {
         throw new Error('test_tts_failure');
      }

      if (!response.ok) {
        throw new Error('TTS Service failure');
      }
      
      const audioArrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(audioArrayBuffer);

      // Upload LIVE generated TTS to R2
      const uuid = crypto.randomUUID();
      const storageKey = `voices/${voiceId}/generated/${uuid}.mp3`;
      await uploadBuffer(audioBuffer, storageKey, 'audio/mpeg');
      const finalAudioUrl = getPublicUrl(storageKey);

      await prisma.generatedAudio.create({
        data: {
          voiceId: voice.id,
          userId: user.id,
          storageKey,
          url: finalAudioUrl,
          characters: requestedLength
        }
      });
      
      // 4. USAGE LOGGING & STRIPE METERING (for overage)
      if (bucketMarking === 'overage') {
         const activeSub = await prisma.subscription.findFirst({
            where: { buyerUserId: user.id, voiceId: voice.id, status: 'active' },
            select: { stripeMeteredItemId: true }
         });

         if (activeSub?.stripeMeteredItemId) {
            try {
               // --- TEST HOOK: STRIPE FAILURE ---
               if (
                 process.env.NODE_ENV !== 'production' && 
                 process.env.ENABLE_TEST_FAILURE_HOOKS === 'true' && 
                 req.headers.get('x-test-secret') === 'vox_super_test_secret'
               ) {
                 if (req.headers.get('x-test-force-stripe-fail') === 'true') {
                    throw new Error('test_stripe_failure');
                 }
                 console.log('[TEST] Mocked Stripe Usage Record Creation');
               } else {
                 await (stripe.subscriptionItems as any).createUsageRecord(
                   activeSub.stripeMeteredItemId,
                   {
                     quantity: requestedLength,
                     timestamp: Math.floor(Date.now() / 1000),
                     action: 'increment',
                   },
                   { idempotencyKey: `usage_${uuid}` }
                 );
               }
            } catch (stripeErr) {
               console.error('Failed to log Stripe Overage Usage:', stripeErr);
               throw new Error('stripe_billing_error');
            }
         }
      }

      await prisma.usageEvent.create({
        data: {
          buyerUserId: user.id,
          voiceId: voice.id,
          eventType: 'paid_generation',
          usageAmount: textToGenerate.length,
          unit: 'characters',
          billingBucket: bucketMarking,
          source: 'app_studio'
        }
      });

      // 5. INTERNAL AUDIT TRAIL
      console.log(JSON.stringify({
         __audit: true,
         requestId: uuid,
         userId: user.id,
         voiceId: voice.id,
         characterCount: requestedLength,
         usageBefore: usageObj.usedTotal,
         usageAfter: usageObj.usedTotal + requestedLength,
         billingBucket: bucketMarking,
         withinIncluded: !isThisRequestOverage,
         ttsSuccess: true,
         stripeMeteredSuccess: bucketMarking === 'overage' ? true : null,
         blockedBy: 'none'
      }));

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'X-VoxMarket-Audio-Url': finalAudioUrl
        },
      });
    }
  } catch (error: any) {
    console.error('[API /generate] Error:', error);
    return NextResponse.json({ error: 'Internal server error while generating audio', message: error.message, stack: error.stack }, { status: 500 });
  }
}
