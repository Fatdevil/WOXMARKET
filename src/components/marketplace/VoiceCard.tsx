'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

export function VoiceCard({ voice, badge }: { voice: any, badge?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  // Formatting variables
  const mockRating = (4.5 + Math.random() * 0.5).toFixed(1);
  const playsCount = Math.floor(Math.random() * 5000) + 1500;
  
  // Deterministic Freshness Badge Logic
  let displayBadge = badge;
  if (!displayBadge && voice.publishedAt) {
     const now = new Date().getTime();
     const published = new Date(voice.publishedAt).getTime();
     const sevenDays = 7 * 24 * 60 * 60 * 1000;
     if (now - published < sevenDays) {
        displayBadge = '🆕 New';
     }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const startPlayback = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(voice.previewUrl || `/api/voices/${voice.id}/preview`);
      audioRef.current.loop = true;
    }
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => startPlayback(), 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    stopPlayback();
  };

  const handleInstantPlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPlaying) stopPlayback();
    else startPlayback();
  };

  // Safe parse Use Cases for the hook display
  let hookUseCase = voice.useCase;
  if (voice.useCase && voice.useCase.startsWith('[')) {
     try {
       const arr = JSON.parse(voice.useCase);
       hookUseCase = arr.length > 0 ? arr[0] : '';
     } catch(e) {}
  }

  return (
    <Link href={`/marketplace/${voice.id}`} style={{ textDecoration: 'none' }}>
      <div 
        className="glass-panel voice-card" 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ 
          padding: '24px', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
          border: isPlaying ? '1px solid var(--color-primary-light)' : '1px solid var(--border-light)',
          boxShadow: isPlaying ? '0 0 30px rgba(124, 58, 237, 0.2)' : 'none',
          transform: isPlaying ? 'translateY(-4px)' : 'none'
        }}
      >
        
        {/* Play indicator waveform/glow */}
        {isPlaying && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))', animation: 'waveform 1.5s infinite linear' }} />
        )}

        {/* Header: Tone, Category, Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
              {voice.language ? voice.language.toUpperCase() : 'EN'}
            </div>
            {voice.tone && (
              <div style={{ background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
                {voice.tone}
              </div>
            )}
            
            {displayBadge && (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}>
                {displayBadge}
              </div>
            )}
          </div>
        </div>

        {/* Body: Title, Creator & Hook */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '4px', fontFamily: 'var(--font-outfit)', transition: 'color 0.2s', color: isPlaying ? 'var(--color-primary-light)' : 'inherit' }}>
            {voice.title}
          </h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
             by <span style={{ color: 'var(--text-secondary)' }}>{voice.creator?.displayName || 'Unknown Creator'}</span>
          </div>
          
          {hookUseCase && (
             <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
               Best for: {hookUseCase}
             </div>
          )}
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {voice.description}
          </p>
        </div>

        {/* Footer: Price & CTA */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
               {voice.priceType === 'subscription' || voice.subscriptionPrice ? `$${voice.subscriptionPrice}` : 'Free'}
               <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/mo</span>
            </div>
          </div>
          
          <button 
            onClick={handleInstantPlay}
            className={isPlaying ? 'btn-secondary' : 'btn-primary'}
            style={{ padding: '8px 16px', borderRadius: '50px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontSize: '0.9rem', fontWeight: 600, color: '#fff', background: isPlaying ? 'transparent' : 'var(--color-primary)' }}
          >
            {isPlaying ? '⏸ Playing' : '▶ Listen'}
          </button>
        </div>
      </div>
    </Link>
  );
}
