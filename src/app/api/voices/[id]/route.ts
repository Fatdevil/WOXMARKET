import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

import { getVoiceMetrics } from '@/lib/creatorMetrics';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const voice = await prisma.voice.findUnique({
      where: { id: params.id },
      include: {
        trainingJobs: {
          orderBy: { startedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!voice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Usually, you might check if user owns voice or is a buyer.
    if (voice.creatorUserId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let metrics = null;
    if (voice.creatorUserId === session.user.id) {
       metrics = await getVoiceMetrics(voice.id);
    }

    return NextResponse.json({ voice, metrics });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
