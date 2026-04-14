import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const inviterId = session.user.id as string;

    // Check existing mapping
    const existing = await prisma.creatorInvite.findUnique({
      where: {
         inviterId_email: { inviterId, email } // Uses the @@unique constraint
      }
    });

    if (existing) {
       return NextResponse.json({ error: 'You have already invited this creator' }, { status: 400 });
    }

    // MVP: Creates DB Record. Email sending infra is skipped per PRD.
    const invite = await prisma.creatorInvite.create({
      data: { inviterId, email }
    });

    return NextResponse.json({ success: true, message: 'Invite sent!', invite });
  } catch (error) {
    if (error && (error as any).code === 'P2002') {
       return NextResponse.json({ error: 'You have already invited this creator' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to process invite' }, { status: 500 });
  }
}
