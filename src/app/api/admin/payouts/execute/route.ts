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

    const { batchId } = await req.json();

    if (!batchId) {
      return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
    }

    // Single deterministic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate the batch exists and isn't already processed
      const batch = await tx.creatorPayoutBatch.findUnique({
        where: { id: batchId }
      });

      if (!batch) {
        throw new Error('Batch not found');
      }
      
      if (batch.status === 'completed') {
        throw new Error('Batch already executed');
      }

      const now = new Date();

      // 2. Update all underlying earnings exactly matching the batchId and not already paid
      await tx.creatorEarning.updateMany({
        where: { 
          payoutBatchId: batchId,
          status: { not: 'paid' }
        },
        data: { 
          status: 'paid',
          paidAt: now
        }
      });

      // 3. Mark payout snapshot items as paid
      await tx.creatorPayoutItem.updateMany({
        where: { batchId: batchId },
        data: {
          status: 'paid',
          paidAt: now
        }
      });

      // 4. Close out the batch
      const updatedBatch = await tx.creatorPayoutBatch.update({
        where: { id: batchId },
        data: {
          status: 'completed',
          executedAt: now
        }
      });

      return updatedBatch;
    });

    return NextResponse.json({ success: true, batchStatus: result.status });
  } catch (error: any) {
    console.error('[Admin Payout] Execute Batch error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
