import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, absoluteUrl } from '@/lib/stripe';
import prisma from '@/lib/prisma';

// Stripe hits this as a GET request when the user abandons the flow
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.redirect(absoluteUrl('/login?error=Unauthorized'));
    }

    const { id: userId } = session.user as any;

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId }
    });

    if (!creatorProfile || !creatorProfile.stripeAccountId) {
      return NextResponse.redirect(absoluteUrl('/dashboard?error=MissingStripeAccount'));
    }

    // Refresh the AccountLink
    const accountLink = await stripe.accountLinks.create({
      account: creatorProfile.stripeAccountId,
      refresh_url: absoluteUrl(`/api/connect/refresh`),
      return_url: absoluteUrl('/dashboard?connect=true'),
      type: 'account_onboarding',
    });

    return NextResponse.redirect(accountLink.url);

  } catch (error: any) {
    console.error('[Stripe Connect] Refresh error:', error);
    return NextResponse.redirect(absoluteUrl('/dashboard?error=StripeRefreshError'));
  }
}
