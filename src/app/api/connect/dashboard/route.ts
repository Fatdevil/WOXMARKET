import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = session.user as any;

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile || !creatorProfile.stripeAccountId) {
      return NextResponse.json({ error: 'No Stripe account linked.' }, { status: 400 });
    }

    // Create a login link for the Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(creatorProfile.stripeAccountId);

    return NextResponse.json({ url: loginLink.url });

  } catch (error: any) {
    console.error('[Stripe Connect] Dashboard link error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
