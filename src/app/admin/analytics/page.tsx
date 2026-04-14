import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { getAdminDashboardMetrics } from '@/lib/adminAnalytics';
import Link from 'next/link';

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect('/marketplace');
  }

  const metrics = await getAdminDashboardMetrics();
  const { health, subs, usage, creator, modFlow } = metrics;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px', paddingTop: '40px' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
            ADMIN PORTAL
          </div>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800 }}>Business Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Internal operator view: Health, usage risk, and creator performance.</p>
        </div>
        <Link href="/admin/moderation" className="btn btn-secondary">
          Go to Moderation Queue
        </Link>
      </header>

      {/* SECTION 1 - Top Summary Cards */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Marketplace Health</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '48px' }}>
         <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-success)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Live Voices</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{health.live.toLocaleString()}</div>
         </div>
         <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Pending Review</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{health.pending.toLocaleString()}</div>
         </div>
         <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Active Subscriptions</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{subs.activeCount.toLocaleString()}</div>
         </div>
         <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-accent)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Estimated MRR</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>${subs.estimatedMRR.toFixed(2)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', marginTop: '4px' }}>Avg ${subs.avgRevPerSub.toFixed(2)} / active sub</div>
         </div>
      </div>

      {/* SECTION 2 - Usage / Cost Risk */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Usage Risk (Month To Date)</h2>
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '48px', border: '1px solid var(--border-light)' }}>
         <div style={{ display: 'flex', gap: '48px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--border-light)' }}>
            <div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Paid Characters (MTD)</div>
               <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{usage.totalChars.toLocaleString()}</div>
            </div>
            <div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Paid Generations (MTD)</div>
               <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{usage.totalGenerations.toLocaleString()}</div>
            </div>
            <div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Avg Chars / Generation</div>
               <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Math.round(usage.avgCharsPerGen).toLocaleString()}</div>
            </div>
         </div>

         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div>
               <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--color-error)' }}>Top Users by Usage (Burn Rate Risk)</h3>
               {usage.topUsers.length === 0 ? (
                 <div style={{ color: 'var(--text-muted)' }}>No paid usage recorded this month.</div>
               ) : (
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                   <thead>
                     <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <th style={{ paddingBottom: '8px' }}>User</th>
                        <th style={{ paddingBottom: '8px' }}>Generations</th>
                        <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Characters</th>
                     </tr>
                   </thead>
                   <tbody>
                     {usage.topUsers.map((u, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                         <td style={{ padding: '12px 0' }}>{u.user}</td>
                         <td style={{ padding: '12px 0' }}>{u.generations.toLocaleString()}</td>
                         <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>{u.totalChars.toLocaleString()}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
            </div>

            <div>
               <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--color-warning)' }}>Top Voices by Usage (Cost / Value Drivers)</h3>
               {usage.topVoices.length === 0 ? (
                 <div style={{ color: 'var(--text-muted)' }}>No paid usage recorded this month.</div>
               ) : (
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                   <thead>
                     <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <th style={{ paddingBottom: '8px' }}>Voice</th>
                        <th style={{ paddingBottom: '8px' }}>Creator</th>
                        <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Characters</th>
                     </tr>
                   </thead>
                   <tbody>
                     {usage.topVoices.map((v, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                         <td style={{ padding: '12px 0', fontWeight: 500 }}>{v.title}</td>
                         <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>{v.creator}</td>
                         <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>{v.totalChars.toLocaleString()}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
            </div>
         </div>
      </div>

      {/* SECTION 3 - Creator Performance */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Creator & Revenue Performance</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
         
         <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Top Voices by Subscribers</h3>
            {creator.topSubscribedVoices.length === 0 ? (
               <div style={{ color: 'var(--text-muted)' }}>No active subscriptions yet.</div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {creator.topSubscribedVoices.map((v, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                       <div>
                         <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v.title}</div>
                         <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>by {v.creator}</div>
                       </div>
                       <div style={{ background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600 }}>
                         {v.subs} subs
                       </div>
                    </div>
                  ))}
               </div>
            )}
         </div>

         <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Top Voices by Est. MRR (Creator Cut)</h3>
            {creator.topEarningVoices.length === 0 ? (
               <div style={{ color: 'var(--text-muted)' }}>No active subscriptions yet.</div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {creator.topEarningVoices.map((v, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                       <div>
                         <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v.title}</div>
                         <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>by {v.creator}</div>
                       </div>
                       <div style={{ color: 'var(--color-success)', fontSize: '0.9rem', fontWeight: 600 }}>
                         ${v.estEarnings.toFixed(2)}/mo
                       </div>
                    </div>
                  ))}
               </div>
            )}
         </div>

         <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Newest Approved Voices</h3>
            {creator.newestApprovedVoices.length === 0 ? (
               <div style={{ color: 'var(--text-muted)' }}>No voices approved yet.</div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {creator.newestApprovedVoices.map((v, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                       <div>
                         <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v.title}</div>
                         <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>by {v.creator}</div>
                       </div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                         {new Date(v.approvedAt).toLocaleDateString()}
                       </div>
                    </div>
                  ))}
               </div>
            )}
         </div>
      </div>

      {/* SECTION 4 - Moderation Flow Snapshot */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Moderation Flow (This Week)</h2>
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '48px' }}>
         <div>
           <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pending Review</div>
           <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>{modFlow.pendingCount}</div>
         </div>
         <div>
           <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Approved This Week</div>
           <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{modFlow.approvedThisWeek}</div>
         </div>
         <div>
           <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rejected This Week</div>
           <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-error)' }}>{modFlow.rejectedThisWeek}</div>
         </div>
      </div>

    </div>
  );
}
