'use client';

import { useState } from 'react';

export function ShareVoiceButton({ voiceId }: { voiceId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
     e.preventDefault(); // Stop Link navigations if wrapped inside cards
     
     const url = `${window.location.origin}/voice/${voiceId}`;
     
     try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);

        // Ping tracking engine
        fetch('/api/track', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ event: 'voice_shared', voiceId })
        }).catch(() => {});
        
     } catch (err) {
        console.error('Failed to copy', err);
     }
  };

  return (
    <button 
      onClick={handleShare}
      className="btn" 
      style={{ 
        padding: '8px 16px', 
        borderRadius: '8px', 
        fontSize: '0.9rem', 
        color: copied ? '#fff' : 'var(--text-primary)', 
        background: copied ? 'var(--color-success)' : 'var(--bg-card)', 
        border: copied ? '1px solid var(--color-success)' : '1px solid var(--border-light)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      {copied ? '✓ Link Copied!' : '🔗 Share Voice'}
    </button>
  );
}
