import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batches = await prisma.creatorPayoutBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true } // Number of creators in batch
        }
      }
    });

    return NextResponse.json({ batches });
  } catch (error: any) {
    console.error('[Admin] Get Payouts error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
