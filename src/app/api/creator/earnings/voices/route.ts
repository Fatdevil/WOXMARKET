import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEarningsByVoiceBreakdown } from '@/lib/services/earningsService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'creator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: creatorId } = session.user as any;
    
    const data = await getEarningsByVoiceBreakdown(creatorId);

    return NextResponse.json({ voices: data });

  } catch (error: any) {
    console.error('[Creator Earnings API] Voices breakdown error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
