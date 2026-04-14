import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { stripe, absoluteUrl } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { voiceId } = await req.json();

    if (!voiceId) {
      return NextResponse.json({ error: 'Missing voiceId' }, { status: 400 });
    }

    // 1. Verify User
    const sessionUser = session.user as any;
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Verify Voice
    const voice = await prisma.voice.findUnique({
      where: { id: voiceId, visibility: 'public' }
    });

    if (!voice || !voice.subscriptionPrice) {
      return NextResponse.json({ error: 'Voice not available or missing price' }, { status: 404 });
    }

    // 3. Find or Create Stripe Customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: {
          userId: user.id
        }
      });
      stripeCustomerId = stripeCustomer.id;

      // Persist the customer ID to our DB for future use
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId }
      });
    }

    // 4. Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: `Voice Subscription: ${voice.title}`,
              description: voice.description || undefined,
            },
            unit_amount: Math.round(voice.subscriptionPrice * 100), // Convert to ore/cents
            recurring: { interval: 'month' }
          },
          quantity: 1,
        }
      ],
      metadata: {
        voiceId: voice.id,
        userId: user.id
      },
      subscription_data: {
        metadata: {
          voiceId: voice.id,
          userId: user.id
        }
      },
      success_url: absoluteUrl('/billing/success?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: absoluteUrl(`/marketplace/${voice.id}`)
    });

    return NextResponse.json({ url: checkoutSession.url });

  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}
