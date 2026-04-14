import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user?.email || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const voiceId = params.id;

    const voice = await prisma.voice.findUnique({ where: { id: voiceId } });
    if (!voice) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
    }

    const updatedVoice = await prisma.voice.update({
      where: { id: voiceId },
      data: {
        moderationStatus: 'approved',
        moderatedAt: new Date(),
        moderatedBy: user.email,
        visibility: 'public', // Set to public upon approval
      }
    });

    return NextResponse.json({ success: true, voice: updatedVoice }, { status: 200 });

  } catch (error) {
    console.error('[Admin Approve Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
