'use client';

import { useState } from 'react';

// Lightweight local time formatter "Submitted 2 hours ago"
function timeAgo(dateString?: string | null) {
  if (!dateString) return 'Unknown time';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

// Safely parse JSON array or return empty array
function safeParseArray(jsonStr?: string | null): string[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export default function ModerationList({ voices }: { voices: any[] }) {
  const [list, setList] = useState(voices);
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const [inFlight, setInFlight] = useState<Record<string, boolean>>({});

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    // Basic validation
    const reason = reasonMap[id] || '';
    if (action === 'reject' && !reason.trim()) {
      alert('You must provide a rejection reason.');
      return;
    }

    setInFlight(prev => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/admin/voices/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!res.ok) throw new Error(`Failed to ${action}`);

      // Successfully processed! Remove from the UI immediately
      setList(prev => prev.filter(v => v.id !== id));
      
    } catch (err) {
      console.error(err);
      alert(`Error performing ${action}. See console.`);
    } finally {
      // Free up loading state (mostly irrelevant since it is unmounted, but good practice if error occurs)
      setInFlight(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>
        Found {list.length} pending voices requiring review.
      </div>

      {list.map(voice => {
        const useCases = safeParseArray(voice.useCase);
        const isLoading = inFlight[voice.id];

        return (
          <div key={voice.id} className="glass-panel" style={{ 
            padding: '24px', 
            border: '1px solid var(--border-light)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px',
            opacity: isLoading ? 0.6 : 1,
            pointerEvents: isLoading ? 'none' : 'auto',
            transition: 'all 0.2s'
          }}>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                 <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-outfit)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                   {voice.title}
                 </h3>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                   Created by <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{voice.creator.displayName}</span> ({voice.creator.email})
                 </div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                   Submitted {timeAgo(voice.submittedAt || voice.createdAt)}
                 </div>
               </div>
               
               <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)', padding: '12px 20px', borderRadius: '8px', textAlign: 'right' }}>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Price</div>
                 <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)' }}>
                   {voice.priceType === 'subscription' || voice.subscriptionPrice ? `$${voice.subscriptionPrice}` : 'Free/None'}
                 </div>
               </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description</div>
                  <div style={{ color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4, fontSize: '0.95rem' }}>
                    {voice.description || '-'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', width: '100px' }}>Language:</span>
                     <span style={{ fontWeight: 500, textTransform: 'uppercase', fontSize: '0.85rem' }}>{voice.language}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', width: '100px' }}>Tone:</span>
                     <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{voice.tone || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', width: '100px' }}>Preset:</span>
                     <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{voice.enhancementPreset || '-'}</span>
                  </div>
                </div>
             </div>

             {useCases.length > 0 && (
               <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Use Cases</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {useCases.map((uc: string) => (
                      <span key={uc} style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-light)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem' }}>
                        {uc}
                      </span>
                    ))}
                  </div>
               </div>
             )}
             
             {voice.previewUrl && (
               <div style={{ width: '100%', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px' }}>
                  <audio controls src={voice.previewUrl} style={{ width: '100%', height: '40px' }} />
               </div>
             )}

             <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
               
               <button 
                  onClick={() => handleAction(voice.id, 'approve')} 
                  disabled={isLoading}
                  className="btn" 
                  style={{ padding: '12px 32px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}
               >
                 {isLoading ? 'Processing...' : '✓ Approve'}
               </button>
               
               <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                 <input 
                   type="text" 
                   placeholder="Reject reason (required)..."
                   value={reasonMap[voice.id] || ''}
                   onChange={e => setReasonMap({...reasonMap, [voice.id]: e.target.value})}
                   style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--color-error)', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '300px' }}
                   disabled={isLoading}
                 />
                 <button 
                  onClick={() => handleAction(voice.id, 'reject')} 
                  disabled={isLoading}
                  className="btn" 
                  style={{ padding: '12px 24px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 }}
                 >
                   ✕ Reject
                 </button>
               </div>
             </div>
          </div>
        );
      })}
    </div>
  );
}
