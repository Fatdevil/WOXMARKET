'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems = session?.user?.role === 'creator' 
    ? [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Voices', href: '/voices' },
        { label: '✨ Create Voice', href: '/create/voice' },
        { label: 'Revenue', href: '/revenue' },
        { label: 'Settings', href: '/settings' },
      ]
    : [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Marketplace', href: '/marketplace' },
        { label: 'Subscriptions', href: '/subscriptions' },
        { label: 'Settings', href: '/settings' },
      ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', borderRight: '1px solid var(--border-light)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '40px' }}>
          <span className="text-gradient">VOX</span>MARKET
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: isActive ? 'var(--glass-bg)' : 'transparent',
                  color: isActive ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s',
                  border: isActive ? '1px solid var(--border-light)' : '1px solid transparent'
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{session?.user?.name}</div>
            <div style={{ color: 'var(--text-muted)' }}>{session?.user?.role}</div>
          </div>
          <button 
            onClick={() => signOut()} 
            style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(220, 38, 38, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(220, 38, 38, 0.2)' }}
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
