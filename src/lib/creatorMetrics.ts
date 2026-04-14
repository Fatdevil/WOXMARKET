import prisma from '@/lib/prisma';

export interface VoiceMetrics {
  id: string;
  title: string;
  status: string;
  visibility: string;
  moderationStatus: string;
  subscribers: number;
  charactersGeneratedThisMonth: number;
  totalGenerations: number;
  estimatedMonthlyEarnings: number;
  pendingRealEarnings: number;
  availableRealEarnings: number;
}

export interface CreatorDashboardMetrics {
  totalVoices: number;
  totalSubscribers: number;
  totalCharacters: number;
  totalGenerations: number;
  estimatedMonthlyEarnings: number;
  pendingRealEarnings: number;
  availableRealEarnings: number;
  paidRealEarnings: number;
  stripeConnectStatus: string | null;
  voices: VoiceMetrics[];
}

/**
 * Calculates metrics for a single voice.
 * Used primarily for the individual Voice Detail page.
 */
export async function getVoiceMetrics(voiceId: string): Promise<VoiceMetrics | null> {
  const voice = await prisma.voice.findUnique({
    where: { id: voiceId },
    select: {
      id: true,
      title: true,
      status: true,
      visibility: true,
      moderationStatus: true,
      subscriptionPrice: true,
    }
  });

  if (!voice) return null;

  // Active subscribers count
  const subscribers = await prisma.subscription.count({
    where: {
      voiceId,
      status: 'active'
    }
  });

  // Calculate beginning of the current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Generative usage this month
  const usageAggregate = await prisma.usageEvent.aggregate({
    where: {
      voiceId,
      eventType: 'paid_generation',
      timestamp: { gte: firstDayOfMonth }
    },
    _sum: { usageAmount: true },
    _count: { id: true }
  });

  const chars = usageAggregate._sum.usageAmount || 0;
  const totalGens = usageAggregate._count.id || 0;
  const earnings = subscribers * (voice.subscriptionPrice || 0) * 0.3;

  const realEarningsAggr = await prisma.creatorEarning.groupBy({
    by: ['status'],
    where: { voiceId },
    _sum: { creatorAmount: true }
  });

  let pendingRealEarnings = 0;
  let availableRealEarnings = 0;
  realEarningsAggr.forEach((group: any) => {
    if (group.status === 'pending') pendingRealEarnings += (group._sum.creatorAmount || 0) / 100;
    if (group.status === 'available') availableRealEarnings += (group._sum.creatorAmount || 0) / 100;
  });

  return {
    id: voice.id,
    title: voice.title,
    status: voice.status,
    visibility: voice.visibility,
    moderationStatus: voice.moderationStatus,
    subscribers,
    charactersGeneratedThisMonth: chars,
    totalGenerations: totalGens,
    estimatedMonthlyEarnings: earnings,
    pendingRealEarnings,
    availableRealEarnings
  };
}

/**
 * High-performance batch aggregator for rendering the entire Creator Dashboard accurately without N+1 loops.
 */
export async function getCreatorDashboardMetrics(creatorId: string): Promise<CreatorDashboardMetrics> {
  // 1. Fetch all voices
  const voices = await prisma.voice.findMany({
    where: { creatorUserId: creatorId },
    select: {
      id: true,
      title: true,
      status: true,
      visibility: true,
      moderationStatus: true,
      subscriptionPrice: true,
    }
  });

  // Check stripe status early
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: creatorId },
    select: { stripeConnectStatus: true }
  });

  if (voices.length === 0) {
    return {
      totalVoices: 0,
      totalSubscribers: 0,
      totalCharacters: 0,
      totalGenerations: 0,
      estimatedMonthlyEarnings: 0,
      pendingRealEarnings: 0,
      availableRealEarnings: 0,
      paidRealEarnings: 0,
      stripeConnectStatus: creatorProfile?.stripeConnectStatus || null,
      voices: []
    };
  }

  const voiceIds = voices.map((v: any) => v.id);

  // 2. Fetch grouped subscriptions
  const subGroup = await prisma.subscription.groupBy({
    by: ['voiceId'],
    where: {
      voiceId: { in: voiceIds },
      status: 'active'
    },
    _count: { id: true }
  });

  // 3. Fetch grouped usage
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const usageGroup = await prisma.usageEvent.groupBy({
    by: ['voiceId'],
    where: {
      voiceId: { in: voiceIds },
      eventType: 'paid_generation',
      timestamp: { gte: firstDayOfMonth }
    },
    _sum: { usageAmount: true },
    _count: { id: true }
  });

  // Maps for efficient merging
  const subMap = new Map<string, number>();
  subGroup.forEach((g: any) => subMap.set(g.voiceId, g._count.id));

  const usageMap = new Map<string, { chars: number, gens: number }>();
  usageGroup.forEach((g: any) => usageMap.set(g.voiceId, {
    chars: g._sum.usageAmount || 0,
    gens: g._count.id || 0
  }));

  let totalSubscribers = 0;
  let totalCharacters = 0;
  let totalGenerations = 0;
  let estimatedMonthlyEarnings = 0;

  // (stripe status already fetched above)

  // 5. Fetch all CreatorEarnings grouped by voice and status
  const earningsGroup = await prisma.creatorEarning.groupBy({
    by: ['voiceId', 'status'],
    where: { creatorUserId: creatorId },
    _sum: { creatorAmount: true }
  });

  const earningsMap = new Map<string, { pending: number, available: number, paid: number }>();
  let overallPending = 0;
  let overallAvailable = 0;
  let overallPaid = 0;

  earningsGroup.forEach((g: any) => {
    let balances = earningsMap.get(g.voiceId);
    if (!balances) {
      balances = { pending: 0, available: 0, paid: 0 };
      earningsMap.set(g.voiceId, balances);
    }
    const amountFloat = (g._sum.creatorAmount || 0) / 100;
    if (g.status === 'pending') { balances.pending += amountFloat; overallPending += amountFloat; }
    if (g.status === 'available') { balances.available += amountFloat; overallAvailable += amountFloat; }
    if (g.status === 'paid') { balances.paid += amountFloat; overallPaid += amountFloat; }
  });

  // 6. Merge into VoiceMetrics
  const voiceMetricsList = voices.map((voice: any) => {
    const subs = subMap.get(voice.id) || 0;
    const usage = usageMap.get(voice.id) || { chars: 0, gens: 0 };
    const earnings = subs * (voice.subscriptionPrice || 0) * 0.3;
    const realEarnings = earningsMap.get(voice.id) || { pending: 0, available: 0, paid: 0 };

    totalSubscribers += subs;
    totalCharacters += usage.chars;
    totalGenerations += usage.gens;
    estimatedMonthlyEarnings += earnings;

    return {
      id: voice.id,
      title: voice.title,
      status: voice.status,
      visibility: voice.visibility,
      moderationStatus: voice.moderationStatus,
      subscribers: subs,
      charactersGeneratedThisMonth: usage.chars,
      totalGenerations: usage.gens,
      estimatedMonthlyEarnings: earnings,
      pendingRealEarnings: realEarnings.pending,
      availableRealEarnings: realEarnings.available
    };
  });

  // 7. Sort by Top Performance: Real Pending Earnings -> Estimated Earnings -> Subs -> Usage -> Title
  voiceMetricsList.sort((a: VoiceMetrics, b: VoiceMetrics) => {
    if (b.pendingRealEarnings !== a.pendingRealEarnings) return b.pendingRealEarnings - a.pendingRealEarnings;
    if (b.estimatedMonthlyEarnings !== a.estimatedMonthlyEarnings) return b.estimatedMonthlyEarnings - a.estimatedMonthlyEarnings;
    if (b.subscribers !== a.subscribers) return b.subscribers - a.subscribers;
    if (b.charactersGeneratedThisMonth !== a.charactersGeneratedThisMonth) return b.charactersGeneratedThisMonth - a.charactersGeneratedThisMonth;
    return a.title.localeCompare(b.title);
  });

  return {
    totalVoices: voices.length,
    totalSubscribers,
    totalCharacters,
    totalGenerations,
    estimatedMonthlyEarnings,
    pendingRealEarnings: overallPending,
    availableRealEarnings: overallAvailable,
    paidRealEarnings: overallPaid,
    stripeConnectStatus: creatorProfile?.stripeConnectStatus || null,
    voices: voiceMetricsList
  };
}
