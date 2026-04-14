import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'creator') {
      return NextResponse.json({ error: 'Unauthorized. Must be a creator.' }, { status: 401 });
    }

    const { title, description, tags, consentText, language, useCases, tone, enhancementPreset, subscriptionPrice } = await req.json();

    if (!title || !consentText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Stringify useCases natively if it arrives as Array
    const safeUseCase = Array.isArray(useCases) ? JSON.stringify(useCases) : null;

    // Use a transaction to ensure both Voice and Consent are created atomically
    const newVoice = await prisma.$transaction(async (tx) => {
      const voice = await tx.voice.create({
        data: {
          creatorUserId: session.user.id,
          title,
          description,
          language: language || 'en',
          tone,
          enhancementPreset,
          useCase: safeUseCase,
          subscriptionPrice: subscriptionPrice ? Number(subscriptionPrice) : null,
          tags: tags || [],
          status: 'draft',
          visibility: 'private',
          moderationStatus: 'pending',
          submittedAt: new Date(),
        },
      });

      await tx.voiceOwnershipConsent.create({
        data: {
          userId: session.user.id,
          voiceId: voice.id,
          consentText,
          // In a real app we might grab IP from headers: req.headers.get('x-forwarded-for')
        },
      });

      return voice;
    });

    return NextResponse.json({ message: 'Voice created', voiceId: newVoice.id }, { status: 201 });
  } catch (error) {
    console.error('Create voice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const voices = await prisma.voice.findMany({
      where: { creatorUserId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ voices });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
