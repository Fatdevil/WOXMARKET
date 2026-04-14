import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { stripe, absoluteUrl } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    
    if (!sessionUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id }
    });

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }

    // Create Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: absoluteUrl('/subscriptions'),
    });

    // In a form action, we want to redirect
    return NextResponse.redirect(portalSession.url, { status: 303 });

  } catch (error: any) {
    console.error('Stripe Portal Error:', error);
    return NextResponse.json(
      { error: 'Failed to access billing portal', details: error.message },
      { status: 500 }
    );
  }
}
