import prisma from '@/lib/prisma';

// Helper: Calculate bounds for Month-to-Date (MTD) queries
function getMTDBounds() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startOfMonth, now };
}

export async function getMarketplaceHealthMetrics() {
  const counts = await prisma.voice.groupBy({
    by: ['moderationStatus', 'visibility'],
    _count: { id: true }
  });

  let live = 0;
  let pending = 0;
  let rejected = 0;
  let privateCount = 0;

  for (const row of counts) {
    if (row.moderationStatus === 'pending') pending += row._count.id;
    if (row.moderationStatus === 'approved' && row.visibility === 'public') live += row._count.id;
    if (row.moderationStatus === 'rejected') rejected += row._count.id;
    if (row.visibility === 'private' && row.moderationStatus !== 'pending' && row.moderationStatus !== 'rejected') privateCount += row._count.id;
  }

  return { live, pending, rejected, privateCount };
}

export async function getSubscriptionMetrics() {
  // Pull active subs with voice price explicitly to calculate MRR
  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'active' },
    select: { voice: { select: { subscriptionPrice: true } } }
  });

  const activeCount = activeSubs.length;
  // Fallback to 0 if subscriptionPrice is missing or null
  const estimatedMRR = activeSubs.reduce((sum, sub) => sum + (sub.voice?.subscriptionPrice || 0), 0);
  
  // TWEAK A: Average Revenue per Active Sub
  const avgRevPerSub = activeCount > 0 ? estimatedMRR / activeCount : 0;

  const canceledCount = await prisma.subscription.count({
    where: { status: 'canceled' }
  });

  return { activeCount, canceledCount, estimatedMRR, avgRevPerSub };
}

export async function getUsageRiskMetrics() {
  const { startOfMonth, now } = getMTDBounds();

  const mtdUsageAgg = await prisma.usageEvent.aggregate({
    where: {
      eventType: 'paid_generation',
      timestamp: { gte: startOfMonth, lte: now }
    },
    _sum: { usageAmount: true },
    _count: { id: true }
  });

  const totalChars = mtdUsageAgg._sum.usageAmount || 0;
  const totalGenerations = mtdUsageAgg._count.id || 0;
  const avgCharsPerGen = totalGenerations > 0 ? totalChars / totalGenerations : 0;

  // Top Ranked Users (Burn Rate Risk)
  const topUsersAgg = await prisma.usageEvent.groupBy({
    by: ['buyerUserId'],
    where: { eventType: 'paid_generation', timestamp: { gte: startOfMonth, lte: now } },
    _sum: { usageAmount: true },
    _count: { id: true },
    orderBy: { _sum: { usageAmount: 'desc' } },
    take: 5
  });

  // Re-map with user details via a fast follow-up query
  const topUsers = await Promise.all(topUsersAgg.map(async (row) => {
    const user = await prisma.user.findUnique({ where: { id: row.buyerUserId }, select: { displayName: true, email: true } });
    return {
      user: user?.displayName || user?.email || 'Unknown User',
      totalChars: row._sum.usageAmount || 0,
      generations: row._count.id
    };
  }));

  // Top Ranked Voices (Cost & Value driver)
  const topVoicesAgg = await prisma.usageEvent.groupBy({
    by: ['voiceId'],
    where: { eventType: 'paid_generation', timestamp: { gte: startOfMonth, lte: now } },
    _sum: { usageAmount: true },
    _count: { id: true },
    orderBy: { _sum: { usageAmount: 'desc' } },
    take: 5
  });

  // Re-map with voice/creator details
  const topVoices = await Promise.all(topVoicesAgg.map(async (row) => {
    const voice = await prisma.voice.findUnique({ 
       where: { id: row.voiceId }, 
       select: { title: true, creator: { select: { displayName: true } } } 
    });
    return {
      title: voice?.title || 'Unknown Voice',
      creator: voice?.creator.displayName || 'Unknown Creator',
      totalChars: row._sum.usageAmount || 0,
      generations: row._count.id
    };
  }));

  return {
    totalChars,
    totalGenerations,
    avgCharsPerGen,
    topUsers,
    topVoices
  };
}

export async function getCreatorPerformanceMetrics() {
  // In a massive scale database, we'd use raw SQL for grouping subs by voiceId and tracking count.
  // Using pure prisma syntax for MVP:
  const subGroup = await prisma.subscription.groupBy({
    by: ['voiceId'],
    where: { status: 'active' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });

  // Hydrate top voices by Subs & Earnings
  const topSubscribedVoicesRaw = await Promise.all(subGroup.map(async (row) => {
     const voice = await prisma.voice.findUnique({
        where: { id: row.voiceId },
        select: { title: true, subscriptionPrice: true, creator: { select: { displayName: true } } }
     });
     
     const subs = row._count.id;
     const estEarnings = subs * (voice?.subscriptionPrice || 0) * 0.3; // MVP 30% cut estimate
     
     return {
       title: voice?.title || 'Unknown',
       creator: voice?.creator.displayName || 'Unknown',
       subs,
       estEarnings
     };
  }));

  const topSubscribedVoices = [...topSubscribedVoicesRaw].sort((a, b) => b.subs - a.subs);
  const topEarningVoices = [...topSubscribedVoicesRaw].sort((a, b) => b.estEarnings - a.estEarnings);

  const newestApprovedVoicesRaw = await prisma.voice.findMany({
    where: { moderationStatus: 'approved' },
    orderBy: { moderatedAt: 'desc' },
    take: 5,
    select: { title: true, creator: { select: { displayName: true } }, moderatedAt: true }
  });

  const newestApprovedVoices = newestApprovedVoicesRaw.map(v => ({
    title: v.title,
    creator: v.creator.displayName,
    approvedAt: v.moderatedAt || new Date()
  }));

  return { topSubscribedVoices, topEarningVoices, newestApprovedVoices };
}

export async function getModerationFlowMetrics() {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Simple start of week approx
  
  const pendingCount = await prisma.voice.count({ where: { moderationStatus: 'pending' } });
  const approvedThisWeek = await prisma.voice.count({ where: { moderationStatus: 'approved', moderatedAt: { gte: startOfWeek } } });
  const rejectedThisWeek = await prisma.voice.count({ where: { moderationStatus: 'rejected', moderatedAt: { gte: startOfWeek } } });

  return { pendingCount, approvedThisWeek, rejectedThisWeek };
}

// Master execution wrapper
export async function getAdminDashboardMetrics() {
  const [health, subs, usage, creator, modFlow] = await Promise.all([
    getMarketplaceHealthMetrics(),
    getSubscriptionMetrics(),
    getUsageRiskMetrics(),
    getCreatorPerformanceMetrics(),
    getModerationFlowMetrics()
  ]);

  return { health, subs, usage, creator, modFlow };
}
