'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

export default function PreviewStudioPage({ params }: { params: { id: string } }) {
  const [text, setText] = useState('Welcome to my VoxMarket preview. This is exactly how your content will sound when using my voice.');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    
    try {
      const res = await fetch(`/api/voices/${params.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('API Error');

      const data = await res.json();
      
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
      }
      
      // Tally character count for the session
      setCharCount(prev => prev + text.length);

    } catch (err) {
      alert('Failed to generate preview.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <div style={{ marginBottom: '16px' }}>
          <Link href={`/voices/${params.id}`} style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Voice
          </Link>
        </div>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2rem', fontWeight: 800 }}>Preview Studio</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Type anything and hear it spoken in this AI voice instantly.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        
        {/* Main Editor */}
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <textarea 
            style={{ 
              width: '100%', 
              minHeight: '200px', 
              background: 'var(--bg-secondary)', 
              border: 'none', 
              color: 'var(--text-primary)',
              fontSize: '1.25rem',
              padding: '24px',
              borderRadius: '12px',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              resize: 'vertical'
            }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something here..."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {text.length} characters
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleGenerate}
              disabled={loading || !text.trim()}
              style={{ fontSize: '1.1rem', padding: '12px 24px', borderRadius: '50px' }}
            >
              {loading ? 'Generating...' : '▶ Generate Speech'}
            </button>
          </div>

          <div style={{ minHeight: '80px', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
            {audioUrl && !loading && (
              <audio src={audioUrl} controls autoPlay style={{ width: '100%', outline: 'none' }} />
            )}
          </div>
        </div>

        {/* Studio Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Current Session</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Generated</span>
              <span style={{ fontWeight: 600 }}>{charCount} chars</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Cost</span>
              <span style={{ fontWeight: 600, color: 'var(--color-primary-light)' }}>$0.00</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
             <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Voice Settings</h3>
             <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fine-tuning options like stability, emotion, and similarity boost will be available in Phase 2.</p>
          </div>

        </div>

      </div>
    </div>
  );
}
