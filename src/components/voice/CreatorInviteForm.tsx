'use client';

import { useState } from 'react';

export function CreatorInviteForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    
    setStatus('loading');
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }
      
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setErrorText(err.message);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
       <h3 style={{ fontSize: '1rem', margin: 0, fontFamily: 'var(--font-outfit)' }}>Invite Creators</h3>
       <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
         Help grow the marketplace by inviting your creative network.
       </p>
       
       <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input 
            type="email" 
            placeholder="Creator email..."
            className="input-field"
            style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            required
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Sending...' : 'Send Invite'}
          </button>
       </form>
       
       {status === 'success' && <div style={{ fontSize: '0.85rem', color: 'var(--color-success)' }}>✨ Invite sent perfectly!</div>}
       {status === 'error' && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)' }}>{errorText}</div>}
    </div>
  );
}
