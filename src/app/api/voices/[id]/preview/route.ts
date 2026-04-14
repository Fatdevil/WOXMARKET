import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadBuffer, getPublicUrl } from '@/lib/storage';
import crypto from 'crypto';

// ✅ STATIC PREVIEW ENPOINT (Used by VoiceCards, Marketplace, Admin)
// Caches the permanent preview audio for a voice in R2 and DB.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const voice = await prisma.voice.findUnique({ where: { id: params.id } });
    if (!voice || voice.status !== 'ready') return NextResponse.json({ error: 'Not ready' }, { status: 400 });

    if (voice.previewUrl) {
      return NextResponse.redirect(voice.previewUrl);
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const defaultText = `Hi there! This is a preview of ${voice.title} on Vox Market.`;
    let audioBuffer: any;

    if (!apiKey) {
      const mockObj = await fetch('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
      audioBuffer = Buffer.from(await mockObj.arrayBuffer());
    } else {
      const elevenLabsVoiceId = voice.modelVersion || "21m00Tcm4TlvDq8ikWAM"; // Fallback Rachel
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
        method: 'POST',
        headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
        body: JSON.stringify({ text: defaultText, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      });
      if (!response.ok) throw new Error('TTS Gen failed');
      audioBuffer = Buffer.from(await response.arrayBuffer());
    }

    // Persist to Storage
    const uuid = crypto.randomUUID();
    const storageKey = `voices/${voice.id}/preview/${uuid}.mp3`;
    await uploadBuffer(audioBuffer, storageKey, 'audio/mpeg');
    const publicUrl = getPublicUrl(storageKey);

    // Save as permanent Voice preview
    await prisma.voice.update({
      where: { id: voice.id },
      data: { previewUrl: publicUrl }
    });

    return NextResponse.redirect(publicUrl);

  } catch (error) {
    console.error('[API /preview GET] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ✅ DYNAMIC STUDIO PREVIEW (Used by Creator Dashboard)
// Generates audio purely for the preview UI, pushes it to R2, and tracks usage.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const voice = await prisma.voice.findUnique({ where: { id: params.id } });
    if (!voice || voice.status !== 'ready') return NextResponse.json({ error: 'Not ready' }, { status: 400 });

    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    let audioBuffer: any;

    if (!apiKey) {
      await new Promise(r => setTimeout(r, 2000));
      const mockObj = await fetch('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
      audioBuffer = Buffer.from(await mockObj.arrayBuffer());
    } else {
      const elevenLabsVoiceId = voice.modelVersion || "21m00Tcm4TlvDq8ikWAM"; 
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
        method: 'POST',
        headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
        body: JSON.stringify({ text, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      });
      if (!response.ok) throw new Error('TTS Generation failed');
      audioBuffer = Buffer.from(await response.arrayBuffer());
    }

    // Push explicitly generated buffer to storage
    const uuid = crypto.randomUUID();
    const storageKey = `voices/${voice.id}/preview/${uuid}.mp3`;
    await uploadBuffer(audioBuffer, storageKey, 'audio/mpeg');
    const audioUrl = getPublicUrl(storageKey);

    // Track usage
    await prisma.usageEvent.create({
      data: {
        buyerUserId: session.user.id,
        voiceId: voice.id,
        eventType: 'preview_generation',
        usageAmount: text.length,
        unit: 'characters',
        source: 'preview_studio'
      }
    });

    return NextResponse.json({ audioUrl });

  } catch (error) {
    console.error('[API /preview POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
