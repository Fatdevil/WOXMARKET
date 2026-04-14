'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'creator' ? 'creator' : 'buyer';

  const [role, setRole] = useState<'buyer' | 'creator'>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2rem', fontWeight: 800 }}>Create your account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Join VoxMarket today.</p>
        </div>

        {/* Role Selection */}
        <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '4px', borderRadius: '12px', marginBottom: '8px' }}>
           <button 
             type="button"
             onClick={() => setRole('creator')}
             style={{ 
               flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
               background: role === 'creator' ? 'var(--color-primary)' : 'transparent',
               color: role === 'creator' ? '#fff' : 'var(--text-secondary)',
               transition: 'all 0.2s'
             }}
           >
             Earn with your voice
           </button>
           <button 
             type="button"
             onClick={() => setRole('buyer')}
             style={{ 
               flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
               background: role === 'buyer' ? 'var(--color-primary)' : 'transparent',
               color: role === 'buyer' ? '#fff' : 'var(--text-secondary)',
               transition: 'all 0.2s'
             }}
           >
             Use voices in projects
           </button>
        </div>

        {error && <div style={{ color: 'var(--color-error)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">Display Name</label>
            <input type="text" required className="input-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How should we call you?" />
          </div>
          
          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>

          <div className="input-group" style={{ marginBottom: '8px' }}>
            <label className="input-label">Password</label>
            <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={8} />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '16px', fontSize: '1.1rem', borderRadius: '12px', marginTop: '8px' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* 🛡 Trust Block */}
        <div style={{ marginTop: '16px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span style={{ color: 'var(--color-success)' }}>✔</span> You own your voice</div>
          {role === 'creator' && <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span style={{ color: 'var(--color-success)' }}>✔</span> No public sharing without permission</div>}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span style={{ color: 'var(--color-success)' }}>✔</span> Cancel anytime</div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--color-primary-light)' }}>Log in</Link>
        </div>

      </div>
    </div>
  );
}
