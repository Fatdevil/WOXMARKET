import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasActiveVoiceAccess } from '@/lib/access';
import { getUsageStatus } from '@/lib/usage';
import Link from 'next/link';
import { StudioGenerator } from './StudioGenerator';

export default async function UseVoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    redirect(`/marketplace/${resolvedParams.id}?error=login_required`);
  }

  const voiceId = resolvedParams.id;
  const voice = await prisma.voice.findUnique({
    where: { id: voiceId }
  });

  if (!voice) {
    redirect('/marketplace');
  }

  // CORE GATING LOGIC: Server strictly enforces access
  const authorized = await hasActiveVoiceAccess(user.id, voiceId);

  if (!authorized) {
    redirect(`/marketplace/${voiceId}?error=subscription_required`);
  }

  // FETCH USAGE QUOTA
  const usageStatus = await getUsageStatus(user.id, voiceId, voice.subscriptionPrice);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
      
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <Link href="/subscriptions" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Subscriptions
         </Link>
         
         <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', padding: '6px 16px', borderRadius: '50px', fontSize: '0.85rem', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
            Active Subscription: Full Access
         </div>
      </div>

      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px' }}>
          Studio: {voice.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Type text below to generate high-quality speech using your active access.</p>
      </header>

      <StudioGenerator 
        voiceId={voiceId} 
        includedLimit={usageStatus.includedLimit}
        usedTotal={usageStatus.usedTotal}
        includedUsed={usageStatus.includedUsed}
        includedRemaining={usageStatus.includedRemaining}
        overageUsed={usageStatus.overageUsed}
        isOverage={usageStatus.isOverage}
        absoluteCeiling={usageStatus.absoluteCeiling}
        absoluteCeilingReached={usageStatus.absoluteCeilingReached}
        percentUsed={usageStatus.percentUsed}
        overageRatePer1kCents={usageStatus.overageRatePer1kCents}
      />

    </div>
  );
}
