import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

// Track event client-wrapper for public page load
import { PublicPageViewTracker } from './PublicPageViewTracker';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const voice = await prisma.voice.findFirst({
    where: { id: resolvedParams.id, visibility: 'public', moderationStatus: 'approved' },
    include: { creator: { select: { displayName: true } } }
  });

  if (!voice) return { title: 'Voice Not Found | VoxMarket' };

  return {
    title: `${voice.title} by ${voice.creator.displayName} | VoxMarket`,
    description: voice.description || `Checkout this incredible ${voice.tone || 'AI'} voice by ${voice.creator.displayName} on VoxMarket.`,
    openGraph: {
      title: `${voice.title} by ${voice.creator.displayName}`,
      description: `Listen and subscribe to ${voice.title} on VoxMarket.`,
      type: 'website'
    }
  };
}

export default async function PublicVoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const voice = await prisma.voice.findFirst({
    where: { 
      id: resolvedParams.id, 
      visibility: 'public', 
      moderationStatus: 'approved' 
    },
    include: { 
      creator: { select: { displayName: true } },
      listing: true 
    }
  });

  if (!voice) {
    notFound();
  }

  // Determine Sub count roughly if needed? The user mentioned "X subscribers if available"
  // For MVP, we'll pull a quick active sub count.
  const subCount = await prisma.subscription.count({
     where: { voiceId: voice.id, status: 'active' }
  });

  // Safe parse Use Cases
  let useCases: string[] = [];
  if (voice.useCase && voice.useCase.startsWith('[')) {
     try { useCases = JSON.parse(voice.useCase); } catch(e) {}
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Client Tracker */}
      <PublicPageViewTracker voiceId={voice.id} />

      {/* Basic public top bar */}
      <header style={{ padding: '24px 40px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.25rem', fontWeight: 800 }}>
            <span className="text-gradient">VOX</span>MARKET
         </div>
         <Link href="/api/auth/signin?callbackUrl=/marketplace" className="btn btn-secondary" style={{ padding: '8px 24px', borderRadius: '50px' }}>
            Log In
         </Link>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
         
         {/* Center Panel Container */}
         <div className="glass-panel" style={{ maxWidth: '800px', width: '100%', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            
            {/* Top Identity Block */}
            <div style={{ padding: '48px', position: 'relative', borderBottom: '1px solid var(--border-light)' }}>
               {/* Ambient Glow */}
               <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'radial-gradient(circle at center, rgba(124, 58, 237, 0.1), transparent 80%)', zIndex: 0, pointerEvents: 'none' }} />
               
               <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '6px 16px', borderRadius: '50px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
                     <span style={{ color: 'var(--color-success)' }}>●</span> Approved by Platform
                  </div>

                  <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px' }}>
                    {voice.title}
                  </h1>
                  
                  <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                     <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }} />
                     <span>by <strong style={{ color: 'var(--text-primary)' }}>{voice.creator.displayName}</strong></span>
                  </div>
               </div>
            </div>

            {/* Content & Action Block */}
            <div style={{ padding: '48px', display: 'grid', gridTemplateColumns: 'minmax(250px, 1.5fr) 1fr', gap: '48px', alignItems: 'start', background: 'rgba(0,0,0,0.2)' }}>
               
               {/* Left Content */}
               <div>
                 {voice.description ? (
                   <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '24px' }}>
                     {voice.description}
                   </p>
                 ) : null}

                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
                      🌐 {voice.language?.toUpperCase() || 'EN'}
                    </div>
                    {voice.tone && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
                        🎭 {voice.tone}
                      </div>
                    )}
                    {useCases.map((UC, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
                        🎙️ {UC}
                      </div>
                    ))}
                 </div>

                 {/* Basic Public Audio Hook */}
                 <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(124, 58, 237, 0.05)', borderRadius: '12px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 5px 15px rgba(124, 58, 237, 0.4)' }}>
                      ▶️ 
                    </div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontWeight: 600 }}>Audio Preview</div>
                       <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>Log in to access generative tools</div>
                    </div>
                 </div>
               </div>

               {/* Right Conversion Card */}
               <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', border: '2px solid var(--color-primary-light)', boxShadow: '0 10px 40px rgba(124, 58, 237, 0.15)' }}>
                  
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Access this voice
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '3.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', lineHeight: 1 }}>
                      ${voice.subscriptionPrice}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>/mo</span>
                  </div>

                  {subCount > 0 && (
                     <div style={{ color: 'var(--color-accent)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        🔥 Join {subCount} active subscribers
                     </div>
                  )}

                  {/* Public CTA -> Tweak 2 -> Goes to /marketplace/[id] */}
                  <Link href={`/marketplace/${voice.id}`} className="btn btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '50px', fontSize: '1.1rem', justifyContent: 'center', boxShadow: '0 5px 20px rgba(124, 58, 237, 0.3)' }}>
                     Subscribe & Use Voice
                  </Link>

               </div>

            </div>
         </div>

      </main>

    </div>
  );
}
