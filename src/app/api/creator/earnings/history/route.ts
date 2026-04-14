import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEarningsHistoryLogs } from '@/lib/services/earningsService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'creator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: creatorId } = session.user as any;
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const source = searchParams.get('source') || 'all';
    const voiceId = searchParams.get('voiceId') || 'all';
    const take = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('offset') || '0', 10);

    const data = await getEarningsHistoryLogs(creatorId, status, source, voiceId, take, skip);

    return NextResponse.json({ 
      data: data.rows,
      meta: {
        total: data.totalCount,
        limit: take,
        offset: skip
      }
    });

  } catch (error: any) {
    console.error('[Creator Earnings API] History error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
