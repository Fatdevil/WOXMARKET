import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getUsageStatus } from '@/lib/usage';

export default async function SubscriptionsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return <div>Not logged in</div>;
  }

  const user = session.user as any;

  // Fetch all subscriptions for the current buyer
  const subscriptionsRaw = await prisma.subscription.findMany({
    where: { buyerUserId: user.id },
    include: {
      voice: {
        include: { creator: true }
      }
    },
    orderBy: { startedAt: 'desc' }
  });

  const subscriptions = await Promise.all(subscriptionsRaw.map(async (sub: any) => {
    if (sub.status === 'active') {
       const usage = await getUsageStatus(user.id, sub.voiceId, sub.voice.subscriptionPrice);
       return { ...sub, usageStatus: usage };
    }
    return sub;
  }));

  const activeSubs = subscriptions.filter((s: any) => s.status === 'active');
  const pastSubs = subscriptions.filter((s: any) => s.status !== 'active');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
      
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800 }}>
            My Subscriptions
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your active voice subscriptions.</p>
        </div>
      </header>

      {subscriptions.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', maxWidth: '600px', width: '100%', border: '1px solid var(--border-light)' }}>
             <h3 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2rem', marginBottom: '16px' }}>No active subscriptions</h3>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '32px' }}>
               You haven't subscribed to any voices yet. Find the perfect AI voice for your next project.
             </p>
             <Link href="/marketplace" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: '50px' }}>
               Explore Voices
             </Link>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginBottom: '60px' }}>
            {activeSubs.map((sub: any) => (
              <div key={sub.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', border: '1px solid var(--color-primary-light)', boxShadow: '0 10px 30px rgba(124, 58, 237, 0.1)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ background: 'var(--color-success)', color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '50px' }}>
                    ACTIVE
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Since {new Date(sub.startedAt).toLocaleDateString()}
                  </div>
                </div>

                <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-outfit)', marginBottom: '8px' }}>{sub.voice.title}</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  By {sub.voice.creator.displayName}
                </div>

                <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '16px' }}>
                   ${sub.voice.subscriptionPrice} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/mo</span>
                </div>

                <div style={{ marginBottom: '24px', padding: '12px', background: sub.usageStatus?.isOverage ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-card)', borderRadius: '8px', fontSize: '0.85rem' }}>
                   <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Quota this month:</div>
                   <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sub.usageStatus?.usedTotal.toLocaleString() || 0} / {sub.usageStatus?.includedLimit.toLocaleString()} included characters
                   </div>
                   {sub.usageStatus?.isOverage && (
                      <div style={{ marginTop: '8px', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>
                        {sub.usageStatus?.overageUsed.toLocaleString()} overage characters used.<br/>
                        <span style={{ fontWeight: 400 }}>Billed at ${(sub.usageStatus?.overageRatePer1kCents / 100).toFixed(2)} / 1k chars.</span>
                      </div>
                   )}
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Link href={`/marketplace/${sub.voice.id}`} className="btn btn-secondary" style={{ flex: 1, padding: '12px', justifyContent: 'center', borderRadius: '8px', fontSize: '0.9rem' }}>
                    View Voice
                  </Link>
                  <Link href={`/voices/${sub.voice.id}/use`} className="btn btn-primary" style={{ flex: 1, padding: '12px', justifyContent: 'center', borderRadius: '8px', fontSize: '0.9rem' }}>
                    Use Voice
                  </Link>
                </div>

                {/* Manage Billing (Todo Task 9 implementation via form) */}
                <form action="/api/billing/portal" method="POST" style={{ marginTop: '12px' }}>
                  <button type="submit" style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-primary)', width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.9rem', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background='var(--bg-card)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    Manage Billing & Overage
                  </button>
                </form>

              </div>
            ))}
          </div>

          {pastSubs.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'var(--text-secondary)' }}>Canceled / Past Subscriptions</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {pastSubs.map((sub: any) => (
                  <div key={sub.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', opacity: 0.7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '50px', border: '1px solid var(--border-light)' }}>
                        {sub.status.toUpperCase()}
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-outfit)', marginBottom: '8px' }}>{sub.voice.title}</h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                      Canceled: {sub.canceledAt ? new Date(sub.canceledAt).toLocaleDateString() : 'N/A'}
                    </div>
                    
                    <Link href={`/marketplace/${sub.voice.id}`} className="btn btn-secondary" style={{ width: '100%', padding: '12px', justifyContent: 'center', borderRadius: '8px', fontSize: '0.9rem' }}>
                      Resubscribe
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

    </div>
  );
}
