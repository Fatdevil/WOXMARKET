import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CheckoutButton } from './CheckoutButton';

export default async function VoiceProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;

  const voice = await prisma.voice.findUnique({
    where: { id: resolvedParams.id },
    include: {
      creator: {
        select: { displayName: true, id: true }
      },
      listing: true
    }
  });

  if (!voice) {
    redirect('/marketplace');
  }

  const isCreator = sessionUser && sessionUser.id === voice.creatorUserId;
  const isAdminUser = sessionUser?.email ? (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).includes(sessionUser.email.toLowerCase()) : false;

  if (voice.moderationStatus !== 'approved' && !isCreator && !isAdminUser) {
    redirect('/marketplace');
  }

  if (voice.visibility !== 'public' && !isCreator && !isAdminUser) {
    redirect('/marketplace');
  }

  // Check Subscription state
  let isSubscribed = false;
  if (sessionUser) {
    const existingSub = await prisma.subscription.findFirst({
      where: {
        buyerUserId: sessionUser.id,
        voiceId: voice.id,
        status: 'active'
      }
    });
    if (existingSub) isSubscribed = true;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
      
      {/* Background ambient glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '600px', background: 'radial-gradient(ellipse at top center, rgba(124, 58, 237, 0.15), transparent 70%)', zIndex: -1, pointerEvents: 'none' }} />
      
      <div style={{ marginBottom: '24px' }}>
         <Link href="/marketplace" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Marketplace
         </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px', alignItems: 'start' }}>
        
        {/* Main Content (Left) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <header>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '6px 16px', borderRadius: '50px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
                {voice.category}
              </div>
            </div>
            
            <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px' }}>
              {voice.title}
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
               <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }} />
               <span>Created by <strong style={{ color: 'var(--text-primary)' }}>{voice.creator.displayName}</strong></span>
            </div>
          </header>

          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', position: 'relative', overflow: 'hidden', border: '1px solid var(--color-primary-light)', boxShadow: '0 10px 40px rgba(124, 58, 237, 0.1)' }}>
             <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '80px', height: '80px', borderRadius: '50%', fontSize: '2.5rem', paddingLeft: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 10px 30px rgba(124, 58, 237, 0.4)' }}
                >
                  ▶️
                </button>
             </div>
          </div>

          <div>
             <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>About this voice</h2>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.7 }}>
               {voice.description || 'No description provided.'}
             </p>
          </div>
        </div>

        {/* Pricing Card (Right Sidebar) */}
        <div style={{ position: 'sticky', top: '40px' }}>
          <div className="glass-panel" style={{ padding: '40px', border: '2px solid var(--border-light)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
             <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Licensing Plan</h2>
             
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '8px', margin: '24px 0 8px 0' }}>
               <span style={{ fontSize: '4rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', lineHeight: 1 }}>
                 ${voice.subscriptionPrice}
               </span>
               <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>/mo</span>
             </div>

             <div style={{ padding: '12px', background: isSubscribed ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-primary)', border: isSubscribed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-light)', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', color: isSubscribed ? 'var(--color-success)' : 'var(--text-secondary)' }}>
               {isSubscribed 
                 ? "✨ You have full access to this voice." 
                 : "Preview only — full generative voice access requires an active subscription."}
             </div>
             
             {isSubscribed ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <Link href={`/voices/${voice.id}/use`} className="btn btn-primary" style={{ width: '100%', padding: '16px', justifyContent: 'center', borderRadius: '50px', fontSize: '1.1rem' }}>
                   Use Voice
                 </Link>
                 <Link href="/subscriptions" className="btn btn-secondary" style={{ width: '100%', padding: '12px', justifyContent: 'center', borderRadius: '50px', fontSize: '0.9rem' }}>
                   Manage Subscription
                 </Link>
               </div>
             ) : (
                <CheckoutButton voiceId={voice.id} isGuest={!sessionUser} />
             )}
          </div>
        </div>

      </div>

      {/* Discovery Hook: More Voices Like This */}
      <RelatedVoices voice={voice} />

    </div>
  );
}

// Lightweight server component for the related query
async function RelatedVoices({ voice }: { voice: any }) {
   const related = await prisma.voice.findMany({
     where: {
        id: { not: voice.id },
        visibility: 'public',
        status: 'ready',
        moderationStatus: 'approved',
        OR: [
          { tone: voice.tone },
          { creatorUserId: voice.creatorUserId },
          { category: voice.category }
        ]
     },
     include: { creator: { select: { displayName: true } }, listing: true },
     orderBy: [{ listing: { featuredRank: 'desc' } }, { publishedAt: 'desc' }],
     take: 3
   });

   if (related.length === 0) return null;

   return (
     <div style={{ marginTop: '80px', paddingTop: '40px', borderTop: '1px solid var(--border-light)' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '24px', fontFamily: 'var(--font-outfit)' }}>
           More voices like this
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
           {related.map((v: any) => {
              // Lazy import trick since we're in a server file without VoiceCard imported
              // Wait, VoiceCard is already a client component usually imported at top.
              // I didn't import VoiceCard at the top of [id]/page.tsx! Let's just do it cleanly inside the file.
              // I will use a simple mapping to VoiceCard, but I need VoiceCard imported.
              return <VoiceCardWrapper key={v.id} voice={v} />;
           })}
        </div>
     </div>
   );
}

// Wrapper to prevent messing up the top imports of the main file via replace_file_content limit,
// but actually, I should just fix the top imports in a separate hit if I need to. Let's just import it cleanly.
import { VoiceCard } from '@/components/marketplace/VoiceCard';
function VoiceCardWrapper({ voice }: { voice: any }) {
   return <VoiceCard voice={voice} />;
}
