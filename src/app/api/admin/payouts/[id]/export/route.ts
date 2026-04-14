import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: batchId } = await params;

    // Fetch batch with all related creator details and earning counts
    const batch = await prisma.creatorPayoutBatch.findUnique({
      where: { id: batchId },
      include: {
        items: {
          include: {
            creator: {
              include: {
                creatorProfile: true
              }
            }
          }
        },
        earnings: true
      }
    });

    if (!batch) {
      return new NextResponse('Batch not found', { status: 404 });
    }

    // Build map for how many earning lines each creator had in this batch
    const earningsCountPerCreator = new Map<string, number>();
    batch.earnings.forEach(e => {
      earningsCountPerCreator.set(e.creatorUserId, (earningsCountPerCreator.get(e.creatorUserId) || 0) + 1);
    });

    // Generate CSV string
    const headers = [
      'Batch ID',
      'Creator ID',
      'Creator Name',
      'Creator Email',
      'Stripe Account ID',
      'Amount',
      'Currency',
      'Number of Earnings Rows',
      'Batch Status',
      'Batch Created At',
      'Batch Executed At',
      'Batch Notes'
    ];

    const rows = batch.items.map(item => {
      const creator = item.creator;
      const amountStr = (item.totalAmount / 100).toFixed(2);
      const stripeId = creator.creatorProfile?.stripeAccountId || '';
      
      const row = [
        batch.id,
        creator.id,
        `"${creator.displayName}"`,
        `"${creator.email}"`,
        stripeId,
        amountStr,
        item.currency.toUpperCase(),
        earningsCountPerCreator.get(creator.id) || 0,
        batch.status,
        batch.createdAt.toISOString(),
        batch.executedAt ? batch.executedAt.toISOString() : '',
        `"${batch.notes || ''}"`
      ];

      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv; charset=utf-8');
    response.headers.set('Content-Disposition', `attachment; filename="payout_batch_${batch.id}.csv"`);
    
    return response;

  } catch (error: any) {
    console.error('[Admin Payout Export] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
