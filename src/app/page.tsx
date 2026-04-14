import Link from 'next/link';

export default function Home() {
  return (
    <main className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="flex-between" style={{ padding: '24px 0' }}>
        <div style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.5rem', fontWeight: 800 }}>
          <span className="text-gradient">VOX</span>MARKET
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/login" className="btn btn-secondary">Log in</Link>
          <Link href="/register" className="btn btn-primary">Start for free</Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 0 20px 0' }}>
        <div style={{ maxWidth: '800px' }}>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px' }}>
            Turn your voice into <span className="text-gradient">income.</span>
          </h1>
          <p style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px auto' }}>
            Create, publish and get paid every time someone uses your AI voice.
          </p>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
            <Link href="/register?role=creator" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: '50px' }}>
              Start creating
            </Link>
            <Link href="/marketplace" className="btn btn-secondary" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: '50px' }}>
              Browse voices
            </Link>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '12px 24px', background: 'var(--glass-bg)', borderRadius: '50px', border: '1px solid var(--border-light)' }}>
             <button style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>▶️</button>
             <span style={{ fontWeight: 600 }}>Hear how it sounds</span>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section style={{ textAlign: 'center', paddingBottom: '40px' }}>
         <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>
              🔥 120+ voices created
            </div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>
              💰 Creators earning from day one
            </div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>
              ⚡ Instant voice generation
            </div>
         </div>
      </section>

      {/* 3 STEPS */}
      <section style={{ paddingBottom: '120px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🎙️</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>1. Create</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Record your voice in seconds.</p>
          </div>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🚀</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>2. Publish</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Set your price and go live instantly.</p>
          </div>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>💸</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>3. Earn</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Get paid every time your voice is used.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
