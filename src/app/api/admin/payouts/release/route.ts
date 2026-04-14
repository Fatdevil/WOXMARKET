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

    // Calculate the exact 7-day cutoff boundary
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Strict Idempotent query avoiding race conditions
    const updateResult = await prisma.creatorEarning.updateMany({
      where: {
        status: 'pending',
        availableAt: null,
        occurredAt: { lte: sevenDaysAgo }
      },
      data: {
        status: 'available',
        availableAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      releasedCount: updateResult.count,
      message: `Successfully released ${updateResult.count} earnings from hold.` 
    });
  } catch (error: any) {
    console.error('[Admin Payout] Release Hold error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
