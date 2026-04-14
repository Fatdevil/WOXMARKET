import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '60px 40px', textAlign: 'center', border: '1px solid var(--color-success)', boxShadow: '0 20px 60px rgba(16, 185, 129, 0.15)' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
          <span style={{ fontSize: '3rem', color: 'var(--color-success)' }}>✓</span>
        </div>
        
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', marginBottom: '16px' }}>Subscription Active</h1>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '40px' }}>
          Your payment was successful and your subscription is now active! You can now access and use this voice from your dashboard.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Link href="/subscriptions" className="btn btn-primary" style={{ padding: '16px', justifyContent: 'center', borderRadius: '50px', fontSize: '1.1rem' }}>
            Go to My Subscriptions
          </Link>
          <Link href="/marketplace" className="btn btn-secondary" style={{ padding: '16px', justifyContent: 'center', borderRadius: '50px', fontSize: '1.1rem' }}>
            Browse More Voices
          </Link>
        </div>
      </div>
    </div>
  );
}
