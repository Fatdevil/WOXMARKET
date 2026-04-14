import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { PayoutActions } from './PayoutActions';

export default async function AdminPayoutsOverview() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return <div>Unauthorized</div>;
  }

  // Aggregate pending, available, paid earnings
  const earningsAggr = await prisma.creatorEarning.groupBy({
    by: ['status'],
    _sum: { creatorAmount: true }
  });

  let totalPending = 0;
  let totalAvailable = 0;
  let totalPaid = 0;

  earningsAggr.forEach(aggr => {
    if (aggr.status === 'pending') totalPending += (aggr._sum.creatorAmount || 0);
    if (aggr.status === 'available') totalAvailable += (aggr._sum.creatorAmount || 0);
    if (aggr.status === 'paid') totalPaid += (aggr._sum.creatorAmount || 0);
  });

  // Calculate pending ready to release
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const readyToRelease = await prisma.creatorEarning.aggregate({
    where: {
      status: 'pending',
      availableAt: null,
      occurredAt: { lte: sevenDaysAgo }
    },
    _count: { id: true }
  });

  // Fetch batches
  const batches = await prisma.creatorPayoutBatch.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true } }
    }
  });

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>Payout Operations</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage holds, draft batches, and execute manual payments.</p>
        </div>
        <PayoutActions readyCount={readyToRelease._count.id} availableTotal={totalAvailable} />
      </header>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid var(--color-warning)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Pending Holds</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: 'var(--color-warning)' }}>
            ${(totalPending / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {readyToRelease._count.id} items ready to clear
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid #6366f1' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Available To Payout</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: '#818cf8' }}>
            ${(totalAvailable / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Unbatched liquidity
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid var(--color-success)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Lifetime Paid</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: 'var(--color-success)' }}>
            ${(totalPaid / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Batch List */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Payout Batches</h2>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>ID</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Creators</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Total Amount</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}></th>
            </tr>
          </thead>
          <tbody>
            {batches.map(batch => (
              <tr key={batch.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>...{batch.id.slice(-8)}</td>
                <td style={{ padding: '16px' }}>{batch.createdAt.toLocaleDateString()}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                    background: batch.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 165, 0, 0.1)',
                    color: batch.status === 'completed' ? 'var(--color-success)' : 'var(--color-warning)'
                  }}>
                    {batch.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>{batch._count.items} creators</td>
                <td style={{ padding: '16px', fontWeight: 600 }}>${(batch.totalAmount / 100).toFixed(2)}</td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <Link href={`/admin/payouts/${batch.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    View &rarr;
                  </Link>
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No batches have safely processed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
