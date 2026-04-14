import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import ModerationList from './ModerationList';

export default async function AdminModerationPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect('/marketplace'); // Kick out non-admins silently
  }

  // Fetch all pending voices
  const pendingVoices = await prisma.voice.findMany({
    where: { moderationStatus: 'pending' },
    include: {
      creator: { select: { email: true, displayName: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px', paddingTop: '40px' }}>
      <header style={{ marginBottom: '40px' }}>
        <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
          ADMIN PORTAL
        </div>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800 }}>Moderation Queue</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Review pending voice publications before they hit the marketplace.</p>
      </header>

      {pendingVoices.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Queue is empty. Everything is approved! 🎉</h3>
        </div>
      ) : (
        <ModerationList voices={pendingVoices} />
      )}
    </div>
  );
}
