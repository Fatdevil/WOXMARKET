import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getEarningsSummary, getEarningsByVoiceBreakdown } from '@/lib/services/earningsService';
import { EarningsHistoryTable } from './EarningsHistoryTable';

export default async function TrustEarningsDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'creator') {
    return <div>Unauthorized</div>;
  }

  const { id: creatorId } = session.user as any;

  // 1. Fetch Stripe Profile specific state
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: creatorId },
    select: { stripeConnectStatus: true, stripeAccountId: true }
  });

  const stripeStatus = profile?.stripeConnectStatus;

  // 2. Fetch Summaries & Breakdown (RSC Data Layer)
  const summary = await getEarningsSummary(creatorId);
  const voices = await getEarningsByVoiceBreakdown(creatorId);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', fontFamily: 'var(--font-outfit)' }}>
      
      {/* HEADER & CONNECT STATUS BANNER */}
      {(!stripeStatus || stripeStatus === 'not_started' || stripeStatus === 'pending') && (
        <div style={{ 
          background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.5)', 
          padding: '16px 24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
        }}>
          <div>
            <h3 style={{ color: 'var(--color-warning)', marginBottom: '4px' }}>Payouts Not Configured</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>You must complete Stripe Connect onboarding to receive actual deposits to your bank account.</p>
          </div>
          <form action="/api/connect/onboard" method="POST">
            <button className="btn" style={{ background: 'var(--color-warning)', color: '#000', padding: '8px 16px', borderRadius: '8px', fontWeight: 600 }}>Set up Payouts</button>
          </form>
        </div>
      )}

      {stripeStatus === 'restricted' && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.5)', padding: '16px 24px', borderRadius: '12px', marginBottom: '24px' }}>
            <h3 style={{ color: '#ef4444' }}>Stripe Information Missing</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Stripe requires additional identity verification. Please finish your onboarding.</p>
        </div>
      )}

      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Earnings Trust Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '4px' }}>Full transparency into your confirmed finances. Listed exactly as you earned them.</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }}>
          &larr; Back to Platform
        </Link>
      </header>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
        
        <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid var(--color-warning)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Holds</h3>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-warning)' }}>${summary.pendingEarnings.toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Locked inside the {summary.holdPeriodDays}-day hold</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid #6366f1' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Balance</h3>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#818cf8' }}>${summary.availableEarnings.toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Ready for next manual payout</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid var(--color-success)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Paid Out</h3>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-success)' }}>${summary.paidEarnings.toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Successfully deposited to Stripe</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid var(--text-primary)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lifetime Value</h3>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>${summary.lifetimeEarnings.toFixed(2)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            <span>7d: +${summary.earningsTrend.last7d.toFixed(2)}</span>
            <span>30d: +${summary.earningsTrend.last30d.toFixed(2)}</span>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px', marginBottom: '40px' }}>
        {/* TRUST EXPLAINER COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
           <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.1) 100%)' }}>
             <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
               Next Payout Estimate
             </h3>
             <p style={{ color: '#818cf8', fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
               {summary.availableEarnings > 0 ? "Included in upcoming run" : "Awaiting available funds"}
             </p>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
               Available earnings are systematically scooped up and deployed in the next manual payout run.
             </p>
           </div>
           
           <div className="glass-panel" style={{ padding: '24px' }}>
             <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Why are funds pending?</h3>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
               For your security and platform stability, newly generated earnings wait inside an immutable <strong>7-day hold period</strong>.
               Immediately upon maturation, your pending revenues are automatically promoted to <em>Available</em> and injected into the immediate next payout cadence.
             </p>
           </div>

           <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Source Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Subscriptions</span>
                    <span>${summary.earningsBySource.subscription.toFixed(2)}</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#818cf8', width: `${Math.max(1, (summary.earningsBySource.subscription / Math.max(0.01, summary.lifetimeEarnings)) * 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Metered Overage</span>
                    <span>${summary.earningsBySource.overage.toFixed(2)}</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--color-success)', width: `${Math.max(1, (summary.earningsBySource.overage / Math.max(0.01, summary.lifetimeEarnings)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
           </div>
        </div>

        {/* VOICE PERFORMANCE COLUMN */}
        <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Voice Earning Performance</h2>
          </div>
          
          {voices.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>You don't have any voices generating earnings yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-secondary)' }}>Voice Name</th>
                  <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Pending</th>
                  <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Available</th>
                  <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Paid</th>
                  <th style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-secondary)' }}>Lifetime</th>
                </tr>
              </thead>
              <tbody>
                {voices.map(v => (
                  <tr key={v.voiceId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                      {v.voiceName}
                      {v === voices[0] && voices.length > 1 && v.lifetime > 0 && <span style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: '4px' }}>Top Earner</span>}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--color-warning)' }}>${v.pending.toFixed(2)}</td>
                    <td style={{ padding: '16px', color: '#818cf8' }}>${v.available.toFixed(2)}</td>
                    <td style={{ padding: '16px', color: 'var(--color-success)' }}>${v.paid.toFixed(2)}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-primary)' }}>${v.lifetime.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* FULL HISTORY LEDGER TABLE COMPONENT */}
      <EarningsHistoryTable creatorId={creatorId} />

    </div>
  );
}
