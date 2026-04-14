import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, absoluteUrl } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId, email } = session.user as any;

    let creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile) {
      return NextResponse.json({ error: 'Creator profile required to onboard to payouts.' }, { status: 400 });
    }

    let accountId = creatorProfile.stripeAccountId;

    // 1. Create a Stripe Express account if they don't have one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
      });

      accountId = account.id;

      await prisma.creatorProfile.update({
        where: { id: creatorProfile.id },
        data: { 
          stripeAccountId: accountId,
          stripeConnectStatus: 'pending' // Initialize as pending
        }
      });
    }

    // 2. Create an AccountLink to send them to the Stripe Hosted Onboarding flow
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: absoluteUrl(`/api/connect/refresh?userId=${userId}`),
      return_url: absoluteUrl('/dashboard?connect=true'),
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error: any) {
    console.error('[Stripe Connect] Onboarding error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
