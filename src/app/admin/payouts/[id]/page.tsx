import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BatchActions } from './BatchActions';

export default async function AdminPayoutBatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return <div>Unauthorized</div>;
  }

  const { id: batchId } = await params;

  const batch = await prisma.creatorPayoutBatch.findUnique({
    where: { id: batchId },
    include: {
      items: {
        include: {
          creator: {
            include: { creatorProfile: true }
          }
        }
      }
    }
  });

  if (!batch) return notFound();

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
            Batch Detail: {batch.id.slice(-8)}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {batch.createdAt.toLocaleString()} &mdash; Status: <strong style={{color: batch.status === 'completed' ? 'var(--color-success)' : 'orange'}}>{batch.status.toUpperCase()}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/admin/payouts" className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }}>
            &larr; Back
          </Link>
          <BatchActions batchId={batch.id} status={batch.status} />
        </div>
      </header>

      {/* Overview Metric */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '40px', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Payout Amount</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>${(batch.totalAmount / 100).toFixed(2)}</div>
        </div>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Active Creators</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{batch.items.length}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Creator Line Items</h2>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Creator Name</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Contact</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Stripe Account</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Amount</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {batch.items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '16px', fontWeight: 600 }}>{item.creator.displayName}</td>
                <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.creator.email}</td>
                <td style={{ padding: '16px', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                  {item.creator.creatorProfile?.stripeAccountId || <span style={{ color: 'var(--color-warning)' }}>Missing</span>}
                </td>
                <td style={{ padding: '16px', fontWeight: 600, color: '#818cf8' }}>${(item.totalAmount / 100).toFixed(2)}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                    background: item.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                    color: item.status === 'paid' ? 'var(--color-success)' : 'var(--text-secondary)'
                  }}>
                    {item.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
