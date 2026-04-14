import prisma from '@/lib/prisma';

export interface EarningsSummary {
  pendingEarnings: number;
  availableEarnings: number;
  paidEarnings: number;
  lifetimeEarnings: number;
  holdPeriodDays: number;
  currency: string;
  earningsBySource: {
    subscription: number;
    overage: number;
  };
  earningsTrend: {
    last7d: number;
    last30d: number;
  };
}

export interface EarningsByVoice {
  voiceId: string;
  voiceName: string;
  pending: number;
  available: number;
  paid: number;
  lifetime: number;
  last7d: number;
  last30d: number;
  sourceSplit: {
    subscription: number;
    overage: number;
  }
}

/**
 * Returns aggregated net earnings (creatorAmount) for a creator.
 */
export async function getEarningsSummary(creatorId: string): Promise<EarningsSummary> {
  const earnings = await prisma.creatorEarning.findMany({
    where: { creatorUserId: creatorId },
    select: {
      creatorAmount: true,
      status: true,
      sourceType: true,
      occurredAt: true,
      currency: true
    }
  });

  const summary: EarningsSummary = {
    pendingEarnings: 0,
    availableEarnings: 0,
    paidEarnings: 0,
    lifetimeEarnings: 0,
    holdPeriodDays: 7,
    currency: 'USD',
    earningsBySource: { subscription: 0, overage: 0 },
    earningsTrend: { last7d: 0, last30d: 0 },
  };

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  earnings.forEach(e => {
    const amountFloat = e.creatorAmount / 100;

    // Status Aggr
    if (e.status === 'pending') summary.pendingEarnings += amountFloat;
    if (e.status === 'available') summary.availableEarnings += amountFloat;
    if (e.status === 'paid') summary.paidEarnings += amountFloat;
    summary.lifetimeEarnings += amountFloat;

    // Source Aggr
    if (e.sourceType === 'subscription') summary.earningsBySource.subscription += amountFloat;
    if (e.sourceType === 'overage') summary.earningsBySource.overage += amountFloat;

    // Trends
    if (e.occurredAt >= sevenDaysAgo) summary.earningsTrend.last7d += amountFloat;
    if (e.occurredAt >= thirtyDaysAgo) summary.earningsTrend.last30d += amountFloat;
  });

  return summary;
}


/**
 * Returns breakdown per voice based on creator net earnings.
 */
export async function getEarningsByVoiceBreakdown(creatorId: string): Promise<EarningsByVoice[]> {
  const earnings = await prisma.creatorEarning.findMany({
    where: { creatorUserId: creatorId },
    include: { voice: { select: { title: true } } }
  });

  const voiceMap = new Map<string, EarningsByVoice>();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  earnings.forEach(e => {
    const amountFloat = e.creatorAmount / 100;
    let vData = voiceMap.get(e.voiceId);
    
    if (!vData) {
      vData = {
        voiceId: e.voiceId,
        voiceName: e.voice.title,
        pending: 0,
        available: 0,
        paid: 0,
        lifetime: 0,
        last7d: 0,
        last30d: 0,
        sourceSplit: { subscription: 0, overage: 0 }
      };
      voiceMap.set(e.voiceId, vData);
    }

    if (e.status === 'pending') vData.pending += amountFloat;
    if (e.status === 'available') vData.available += amountFloat;
    if (e.status === 'paid') vData.paid += amountFloat;
    vData.lifetime += amountFloat;

    if (e.sourceType === 'subscription') vData.sourceSplit.subscription += amountFloat;
    if (e.sourceType === 'overage') vData.sourceSplit.overage += amountFloat;

    if (e.occurredAt >= sevenDaysAgo) vData.last7d += amountFloat;
    if (e.occurredAt >= thirtyDaysAgo) vData.last30d += amountFloat;
  });

  return Array.from(voiceMap.values()).sort((a, b) => b.lifetime - a.lifetime);
}

/**
 * Returns raw paginated history logs
 */
export async function getEarningsHistoryLogs(
  creatorId: string, 
  statusFilter?: string, 
  sourceFilter?: string, 
  voiceFilter?: string,
  take: number = 50,
  skip: number = 0
) {
  const whereClause: any = { creatorUserId: creatorId };

  if (statusFilter && statusFilter !== 'all') whereClause.status = statusFilter;
  if (sourceFilter && sourceFilter !== 'all') whereClause.sourceType = sourceFilter;
  if (voiceFilter && voiceFilter !== 'all') whereClause.voiceId = voiceFilter;

  const [rows, totalCount] = await Promise.all([
    prisma.creatorEarning.findMany({
      where: whereClause,
      include: { voice: { select: { title: true } } },
      orderBy: { occurredAt: 'desc' },
      take,
      skip
    }),
    prisma.creatorEarning.count({ where: whereClause })
  ]);

  return { rows, totalCount };
}
