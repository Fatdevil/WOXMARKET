import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEarningsSummary } from '@/lib/services/earningsService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'creator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: creatorId } = session.user as any;
    
    const summary = await getEarningsSummary(creatorId);

    // Naive next payout estimate heuristic
    const nextPayoutEstimate = summary.availableEarnings > 0 
      ? "Included in next payout run" 
      : "No available earnings";

    return NextResponse.json({ 
      ...summary, 
      nextPayoutEstimate
    });

  } catch (error: any) {
    console.error('[Creator Earnings API] Summary error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
