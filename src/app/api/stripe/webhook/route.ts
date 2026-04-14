import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

// Required for Stripe Webhooks to disable body parsing by Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Use metadata from subscription_data where we passed voiceId and userId
        const voiceId = subscription.metadata?.voiceId;
        const userId = subscription.metadata?.userId;

        if (!voiceId || !userId) {
          console.warn('Subscription MISSING metadata:', subscription.id);
          break;
        }

        const existingSub = await prisma.subscription.findFirst({
          where: {
            // First try matching specific Stripe sub ID
            OR: [
              { billingProviderSubscriptionId: subscription.id },
              // Fallback to finding by user+voice logic
              { buyerUserId: userId, voiceId: voiceId }
            ]
          }
        });

        const status = subscription.status === 'active' ? 'active' : subscription.status;
        const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null;

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status,
              billingProviderSubscriptionId: subscription.id,
              canceledAt
            }
          });
        } else {
          await prisma.subscription.create({
            data: {
              buyerUserId: userId,
              voiceId: voiceId,
              status,
              startedAt: new Date(subscription.created * 1000),
              billingProviderSubscriptionId: subscription.id,
              canceledAt
            }
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;

        if (!invoice.subscription) {
          // If it isn't linked to a subscription, we skip it for now.
          break;
        }

        const stripeSubId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;

        // Fetch the corresponding subscription to know the voice & creator
        const localSub = await prisma.subscription.findFirst({
          where: { billingProviderSubscriptionId: stripeSubId },
          include: {
            voice: {
              include: {
                creator: {
                  include: {
                    creatorProfile: true
                  }
                }
              }
            }
          }
        });

        if (!localSub) {
          console.warn(`[Webhook] Could not find local subscription for Stripe Sub: ${stripeSubId}`);
          break;
        }

        const voice = localSub.voice;
        const creator = voice.creator;
        const creatorProfile = creator.creatorProfile;

        // Default to a 65% split if the row somehow misses it.
        const sharePercent = creatorProfile?.revenueSharePercent ?? 65.0;

        // Process each line item individually mapped to a deduplicated earning row
        for (const line of invoice.lines.data) {
          // Ignore lines that are 0 cost (like free trials or 100% coupons if applicable)
          if (line.amount <= 0) continue;

          // Figure out if it's fixed or metered
          const isOverage = line.price?.recurring?.usage_type === 'metered';
          const sourceType = isOverage ? 'overage' : 'subscription';

          // Ensure exactly-once by using the unique invoice line item ID 
          // Stripe lines are unique across invoices (e.g. il_1234abcd)
          const sourceReferenceId = line.id;

          const grossAmount = line.amount; // already in cents
          const creatorAmount = Math.floor(grossAmount * (sharePercent / 100.0));
          const platformAmount = grossAmount - creatorAmount;
          
          try {
            await prisma.creatorEarning.create({
              data: {
                creatorUserId: creator.id,
                voiceId: voice.id,
                sourceType,
                sourceReferenceId,
                grossAmount,
                creatorAmount,
                platformAmount,
                currency: invoice.currency || 'usd',
                status: 'pending',     // Initial status
                occurredAt: new Date(invoice.created * 1000)
              }
            });
            console.log(`[Ledger] Created ${sourceType} earning for voice ${voice.id}.`);
          } catch (err: any) {
             // Prisma throws a UniqueConstraintViolation if the exact sourceType + sourceReferenceId already exists
             if (err.code === 'P2002') {
                console.log(`[Ledger] Ignoring duplicate webhook for line ${line.id}`);
             } else {
                console.error(`[Ledger] Error inserting creator earning:`, err);
             }
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
