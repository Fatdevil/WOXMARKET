import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function EarningsHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return <div>Not logged in</div>;

  const { id: userId, role } = session.user as any;
  if (role !== 'creator') {
    return <div>Only creators can access this page.</div>;
  }

  // Fetch all earnings for this creator, joining with Voice info
  const earnings = await prisma.creatorEarning.findMany({
    where: { creatorUserId: userId },
    include: { voice: { select: { title: true } } },
    orderBy: { occurredAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800 }}>Earnings Ledger</h1>
          <p style={{ color: 'var(--text-secondary)' }}>A complete history of your confirmed earnings.</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }}>
          &larr; Back to Dashboard
        </Link>
      </header>

      {earnings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No earnings yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Your earnings will appear here once someone subscribes to your voice or generates overage.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Date</th>
                <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Voice</th>
                <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Type</th>
                <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Amount</th>
                <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map(earning => (
                <tr key={earning.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px', fontSize: '0.9rem' }}>{earning.occurredAt.toLocaleString()}</td>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{earning.voice.title}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                      background: earning.sourceType === 'subscription' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: earning.sourceType === 'subscription' ? '#818cf8' : 'var(--color-success)'
                    }}>
                      {earning.sourceType}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>${(earning.creatorAmount / 100).toFixed(2)}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                      background: earning.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: earning.status === 'paid' ? 'var(--color-success)' : 'var(--text-secondary)'
                    }}>
                      {earning.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
