import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCreatorDashboardMetrics } from '@/lib/creatorMetrics';
import Link from 'next/link';
import { ModerationStatusBadge } from '@/components/voice/ModerationStatusBadge';
import { CreatorInviteForm } from '@/components/voice/CreatorInviteForm';
import { ShareVoiceButton } from '@/components/voice/ShareVoiceButton';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return <div>Not logged in</div>;
  }

  const user = session.user as { id: string; role: string; name: string };
  const isCreator = user.role === 'creator';

  const metrics = isCreator ? await getCreatorDashboardMetrics(user.id) : null;
  const voices = metrics?.voices || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800 }}>
            Welcome back, {user.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your {isCreator ? 'voices and earnings' : 'projects and subscriptions'}.</p>
        </div>
        
        {isCreator && (
          <Link href="/create/voice" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '50px' }}>
            + Create New Voice
          </Link>
        )}
      </header>

      {isCreator && metrics && (
        <>
          {/* Payout Status Stripe Banner */}
          <div className="glass-panel" style={{ marginBottom: '24px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: metrics.stripeConnectStatus === 'complete' ? '4px solid #6366f1' : '4px solid var(--color-warning)' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Creator Payouts</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {metrics.stripeConnectStatus === 'complete' 
                   ? 'Your Stripe account is connected and ready to receive payouts.' 
                   : 'Connect your Stripe account to receive payouts from subscriptions and usage.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/dashboard/earnings" className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }}>
                Ledger History
              </Link>
              {metrics.stripeConnectStatus === 'complete' || metrics.stripeConnectStatus === 'active' ? (
                <form action="/api/connect/dashboard" method="POST">
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', background: '#6366f1' }}>Manage Stripe</button>
                </form>
              ) : metrics.stripeConnectStatus === 'pending' || metrics.stripeConnectStatus === 'restricted' ? (
                <form action="/api/connect/refresh" method="GET">
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px' }}>Finish Onboarding</button>
                </form>
              ) : (
                <form action="/api/connect/onboard" method="POST">
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px' }}>Set Up Payouts</button>
                </form>
              )}
            </div>
          </div>

          {/* Creator Motivation Layer & Invite */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '40px' }}>
             
             {/* Your Impact Metrics */}
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
               
               <div className="glass-panel" style={{ padding: '20px', borderTop: '4px solid var(--color-success)' }}>
                 <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Proj. Run Rate</h3>
                 <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: 'var(--color-success)' }}>
                   ${metrics.estimatedMonthlyEarnings.toFixed(2)}
                 </div>
                 <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>
                   *Based on {metrics.totalSubscribers} active subs
                 </div>
               </div>

               <div className="glass-panel" style={{ padding: '20px', borderTop: '4px solid #6366f1' }}>
                 <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Ledger Balance</h3>
                 <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: '#818cf8' }}>
                   ${(metrics.pendingRealEarnings + metrics.availableRealEarnings).toFixed(2)}
                 </div>
                 <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>
                   Ready: ${metrics.availableRealEarnings.toFixed(2)}
                 </div>
               </div>
               
               <div className="glass-panel" style={{ padding: '20px', borderTop: '4px solid var(--color-primary)' }}>
                 <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Total Usage</h3>
                 <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>
                   {metrics.totalCharacters.toLocaleString()}
                 </div>
                 <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>
                   chars across {metrics.totalVoices} voices
                 </div>
               </div>
             </div>

             {/* Network Growth Block */}
             <CreatorInviteForm />
             
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>My Voices</h2>
          
          {voices.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎙️</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>You haven't created any voices yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '300px' }}>
                Create your first voice and start earning every time someone uses it.
              </p>
              <Link href="/create/voice" className="btn btn-primary" style={{ padding: '12px 32px', borderRadius: '50px' }}>
                Start Creating
              </Link>
            </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {voices.map(voice => (
                    <div key={voice.id} className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: voice.moderationStatus === 'approved' && voice.visibility === 'public' ? '4px solid var(--color-success)' : (voice.moderationStatus === 'rejected' ? '4px solid var(--color-error)' : '4px solid var(--color-warning)') }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{voice.title}</span>
                          <ModerationStatusBadge status={voice.moderationStatus as any} visibility={voice.visibility} showHelper={false} />
                        </div>
                        
                        {/* Dynamic Growth Motivation Copy */}
                        {voice.moderationStatus === 'approved' && voice.visibility === 'public' && (
                           <div style={{ marginTop: '4px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                              {voice.subscribers === 0 ? (
                                <div style={{ color: 'var(--color-success)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   🚀 Your voice is live. Share it to get your first subscriber.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                   <div style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>🔥 {voice.subscribers.toLocaleString()} subscribers</div>
                                   <div><strong style={{ color: 'var(--text-primary)' }}>{voice.charactersGeneratedThisMonth.toLocaleString()}</strong> Chars this month</div>
                                   <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>Earned: ${(voice.pendingRealEarnings + voice.availableRealEarnings).toFixed(2)}</div>
                                </div>
                              )}
                           </div>
                        )}
                        
                        {/* Basic Stats if not public/approved */}
                        {!(voice.moderationStatus === 'approved' && voice.visibility === 'public') && (
                           <div style={{ display: 'flex', gap: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                             <div><strong style={{ color: 'var(--text-primary)' }}>0</strong> Subscribers</div>
                             <div><strong style={{ color: 'var(--text-primary)' }}>0</strong> Chars this month</div>
                             <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>Earned: $0.00</div>
                           </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: '24px' }}>
                        
                        {/* Tweak 1: Share Voice CTA exclusively on Creator Layers */}
                        {voice.moderationStatus === 'approved' && voice.visibility === 'public' && (
                           <ShareVoiceButton voiceId={voice.id} />
                        )}

                        {/* Standard Actions */}
                        {voice.moderationStatus === 'rejected' && (
                           <Link href={`/voices/${voice.id}`} className="btn" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--color-error)', border: '1px solid var(--color-error)', background: 'rgba(239, 68, 68, 0.1)' }}>
                             Edit & Resubmit
                           </Link>
                        )}
                        
                        {(voice.moderationStatus === 'pending' || voice.moderationStatus === 'approved') && (
                           <Link href={`/voices/${voice.id}`} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
                             {voice.moderationStatus === 'approved' ? 'Manage' : 'View Voice'}
                           </Link>
                        )}

                        {voice.visibility === 'private' && voice.moderationStatus !== 'pending' && voice.moderationStatus !== 'rejected' && voice.moderationStatus !== 'approved' && (
                          <Link href={`/voices/${voice.id}`} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
                            Submit for Review
                          </Link>
                        )}
                      </div>

                    </div>
                ))}
             </div>
          )}
        </>
      )}

      {/* Buyer Empty State - High Conversion */}
      {!isCreator && (
         <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', maxWidth: '600px', width: '100%', border: '1px solid var(--color-primary-light)', boxShadow: '0 20px 60px rgba(124, 58, 237, 0.1)' }}>
               <h3 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', marginBottom: '16px', lineHeight: 1.2 }}>Start creating with AI voices</h3>
               <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '32px' }}>
                 Browse the marketplace and find the perfect voice for your project.
               </p>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', marginBottom: '40px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                   <span>🎧</span> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Access hundreds of voices</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                   <span>⚡</span> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Generate audio instantly</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                   <span>💡</span> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Perfect for ads, videos, content</span>
                 </div>
               </div>

               <Link href="/marketplace" className="btn btn-primary" style={{ padding: '20px 40px', fontSize: '1.25rem', borderRadius: '50px', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 30px rgba(124, 58, 237, 0.4)' }}>
                 Explore Voices <span style={{ fontSize: '1.4rem' }}>&rarr;</span>
               </Link>
            </div>
         </div>
      )}
    </div>
  );
}
