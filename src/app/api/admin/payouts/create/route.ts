import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notes } = await req.json().catch(() => ({ notes: '' }));

    // Use interactive transaction to guarantee consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find eligible earnings
      const eligibleEarnings = await tx.creatorEarning.findMany({
        where: {
          status: 'available',
          payoutBatchId: null
        },
        select: { id: true, creatorUserId: true, creatorAmount: true, currency: true }
      });

      if (eligibleEarnings.length === 0) {
        throw new Error('No eligible earnings found to batch.');
      }

      // Group by creator
      const creatorTotals = new Map<string, { totalAmount: number, currency: string }>();
      let globalTotal = 0;

      for (const earning of eligibleEarnings) {
        globalTotal += earning.creatorAmount;
        const current = creatorTotals.get(earning.creatorUserId) || { totalAmount: 0, currency: earning.currency };
        current.totalAmount += earning.creatorAmount;
        creatorTotals.set(earning.creatorUserId, current);
      }

      // 2. Create the Batch
      const batch = await tx.creatorPayoutBatch.create({
        data: {
          totalAmount: globalTotal,
          currency: 'usd', 
          status: 'draft',
          notes: notes || 'Manual admin payout batch'
        }
      });

      // 3. Create Payout Items snapshot
      const itemsData = Array.from(creatorTotals.entries()).map(([creatorId, data]) => ({
        batchId: batch.id,
        creatorId: creatorId,
        totalAmount: data.totalAmount,
        currency: data.currency,
        status: 'pending'
      }));

      await tx.creatorPayoutItem.createMany({
        data: itemsData
      });

      // 4. Link earnings to this batch
      const earningIds = eligibleEarnings.map(e => e.id);
      await tx.creatorEarning.updateMany({
        where: { id: { in: earningIds } },
        data: { payoutBatchId: batch.id }
      });

      return batch;
    });

    return NextResponse.json({ success: true, batchId: result.id });
  } catch (error: any) {
    console.error('[Admin Payout] Create Batch error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
