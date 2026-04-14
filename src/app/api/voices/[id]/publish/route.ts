import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'creator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category, language, priceType, subscriptionPrice, usagePriceUnit } = await req.json();

    const voice = await prisma.voice.findUnique({
      where: { id: params.id }
    });

    if (!voice || voice.creatorUserId !== session.user.id) {
      return NextResponse.json({ error: 'Voice not found or forbidden' }, { status: 403 });
    }

    if (voice.status !== 'ready') {
      return NextResponse.json({ error: 'Voice must be ready before publishing' }, { status: 400 });
    }

    // Transaction to update Voice and create/update Listing
    const result = await prisma.$transaction(async (tx) => {
      const updatedVoice = await tx.voice.update({
        where: { id: params.id },
        data: {
          category,
          language,
          priceType,
          subscriptionPrice: Number(subscriptionPrice),
          usagePriceUnit: Number(usagePriceUnit),
          visibility: 'unlisted', // Explicitly keep out of public browse
          moderationStatus: 'pending', // Force moderation queue
          moderationReason: null, // Clear any previous rejection reasons
          publishedAt: new Date()
        }
      });

      // Upsert Listing to sync but it won't be shown until Voice is approved
      await tx.listing.upsert({
        where: { voiceId: voice.id },
        update: { status: 'active', moderationStatus: 'pending' },
        create: {
          voiceId: voice.id,
          status: 'active',
          moderationStatus: 'pending' 
        }
      });

      return updatedVoice;
    });

    return NextResponse.json({ message: 'Voice published successfully', voice: result });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
