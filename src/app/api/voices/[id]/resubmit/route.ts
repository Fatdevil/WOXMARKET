import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'creator') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const voice = await prisma.voice.findUnique({
      where: { id: params.id }
    });

    if (!voice) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
    }

    // Only allow creator to resubmit their own voice
    if (voice.creatorUserId !== session.user.id) {
       return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    if (voice.moderationStatus !== 'rejected' && voice.moderationStatus !== 'private') {
       return NextResponse.json({ error: 'Can only submit private or rejected voices for review.' }, { status: 400 });
    }

    const updatedVoice = await prisma.voice.update({
      where: { id: params.id },
      data: {
        moderationStatus: 'pending',
        moderationReason: null,   // Clear previous rejection reason
        submittedAt: new Date(),  // explicit submission timestamp
      }
    });

    return NextResponse.json({ message: 'Voice dynamically resubmitted for review.', voice: updatedVoice });
  } catch (error) {
    console.error('Error during resubmit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
