import prisma from '@/lib/prisma';
import { getPlanBillingConfig } from './billing/plans';

/**
 * Convenience helper to determine full usage quota status for UI and backend checks
 * Computes exact boundaries for Overage processing.
 */
export async function getUsageStatus(userId: string, voiceId: string, subscriptionPrice: number | null) {
  const config = getPlanBillingConfig(subscriptionPrice);
  
  // 1. Fetch Subscription bounds to strictly match Stripe Billing Periods
  const sub = await prisma.subscription.findFirst({
    where: { buyerUserId: userId, voiceId: voiceId, status: 'active' },
    select: { currentPeriodStart: true, currentPeriodEnd: true }
  });

  let periodStart = new Date();
  periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1); // Defaults to Calendar MTD
  let periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);

  if (sub?.currentPeriodStart && sub?.currentPeriodEnd) {
    periodStart = sub.currentPeriodStart;
    periodEnd = sub.currentPeriodEnd;
  }

  // 2. Fetch Usage sum within current billing window
  // (Both included and overage buckets count toward the combined absolute ceiling)
  const usageEvents = await prisma.usageEvent.findMany({
    where: {
      buyerUserId: userId,
      voiceId: voiceId,
      eventType: 'paid_generation',
      timestamp: { gte: periodStart, lte: periodEnd }
    },
    select: { usageAmount: true, billingBucket: true }
  });

  const usedTotal = usageEvents.reduce((acc: number, event: any) => acc + event.usageAmount, 0);

  // 3. Mathematical Quota Bucket logic
  const includedLimit = config.includedLimit;
  const absoluteCeiling = config.absoluteCeiling;
  
  const includedUsed = Math.min(usedTotal, includedLimit);
  const includedRemaining = Math.max(0, includedLimit - includedUsed);
  const overageUsed = Math.max(0, usedTotal - includedLimit);
  
  const isOverage = usedTotal >= includedLimit;
  const absoluteCeilingReached = usedTotal >= absoluteCeiling;
  const percentUsed = includedLimit > 0 ? Math.min(100, Math.round((includedUsed / includedLimit) * 100)) : 100;
  
  return {
    includedLimit,
    usedTotal,
    includedUsed,
    includedRemaining,
    overageUsed,
    isOverage,
    absoluteCeiling,
    absoluteCeilingReached,
    percentUsed,
    overageRatePer1kCents: config.overageRatePer1kCents
  };
}

