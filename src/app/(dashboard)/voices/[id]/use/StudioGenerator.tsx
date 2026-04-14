'use client';

import { useState } from 'react';

type StudioGeneratorProps = {
  voiceId: string;
  includedLimit: number;
  usedTotal: number;
  includedUsed: number;
  includedRemaining: number;
  overageUsed: number;
  isOverage: boolean;
  absoluteCeiling: number;
  absoluteCeilingReached: boolean;
  percentUsed: number;
  overageRatePer1kCents: number;
};

export function StudioGenerator(props: StudioGeneratorProps) {
  const { 
    voiceId, includedLimit, usedTotal, includedRemaining, 
    overageUsed, isOverage, absoluteCeiling, absoluteCeilingReached, 
    percentUsed, overageRatePer1kCents 
  } = props;
  
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const localProjectedTotal = usedTotal + text.length;
  const isCappedLocally = localProjectedTotal > absoluteCeiling;

  const handleGenerate = async () => {
    if (text.trim().length === 0) return;
    if (isCappedLocally || absoluteCeilingReached) return;

    setIsGenerating(true);
    setErrorText('');
    setAudioUrl(null);

    try {
      const res = await fetch(`/api/voices/${voiceId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json();
          setErrorText(data.message || 'Usage capacity reached.');
        } else {
          const data = await res.json();
          setErrorText(data.error || 'Failed to generate speech.');
        }
        setIsGenerating(false);
        return;
      }

      // Handle raw audio blob
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

    } catch (err: any) {
      setErrorText(err.message || 'An unexpected error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid var(--color-primary-light)' }}>
       
       <div style={{ background: isOverage ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: isOverage ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-light)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
           <span style={{ color: 'var(--text-secondary)' }}>Included Character Limit</span>
           <span style={{ fontWeight: 600 }}>{usedTotal.toLocaleString()} / {includedLimit.toLocaleString()}</span>
         </div>
         <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
           <div style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%`, height: '100%', background: isOverage ? 'var(--color-warning, #f59e0b)' : 'var(--color-primary)', transition: 'width 0.3s ease' }} />
         </div>
         {isOverage ? (
            <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '6px', fontSize: '0.85rem', color: '#f59e0b' }}>
               <strong>Overage Active:</strong> You have used {overageUsed.toLocaleString()} characters over your included limit. 
               Additional usage is billed automatically at ${(overageRatePer1kCents / 100).toFixed(2)} per 1,000 characters.
            </div>
         ) : (
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
               {includedRemaining.toLocaleString()} included characters remaining
            </div>
         )}
       </div>

       {absoluteCeilingReached && (
         <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600 }}>
           ⚠️ You have reached the absolute hard-limit for this billing cycle ({absoluteCeiling.toLocaleString()} chars). You cannot generate additional speech until next month.
         </div>
       )}

       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
         <label style={{ fontSize: '1.1rem', fontWeight: 600 }}>Script Text</label>
         <textarea 
           className="input-field"
           style={{ width: '100%', minHeight: '150px', resize: 'vertical' }}
           placeholder="Type exactly what you want the voice to say..."
           value={text}
           onChange={(e) => setText(e.target.value)}
           // Cannot write if limit naturally reached from start, or block writing if they exceed? Block UX is annoying, just let them see the red negative remaining.
         />
         <div style={{ textAlign: 'right', fontSize: '0.8rem', color: text.length > 2000 ? 'var(--color-error, #ef4444)' : 'var(--text-secondary)' }}>
           {text.length} / 2000 (Request Max)
         </div>
       </div>
       
       {errorText && (
         <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.3)' }}>
           {errorText}
         </div>
       )}

       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px' }}>
         <div style={{ fontSize: '0.85rem', color: isCappedLocally ? '#ef4444' : 'var(--text-secondary)' }}>
           {isCappedLocally ? `This request exceeds the absolute ceiling of ${absoluteCeiling.toLocaleString()} chars.` : `This request will consume ${text.length} characters.`}
         </div>
         <button 
           onClick={handleGenerate}
           disabled={isGenerating || text.length === 0 || text.length > 2000 || isCappedLocally || absoluteCeilingReached}
           className="btn btn-primary" 
           style={{ padding: '12px 32px', borderRadius: '50px', fontSize: '1.1rem', opacity: (isGenerating || text.length === 0 || text.length > 2000 || isCappedLocally || absoluteCeilingReached) ? 0.5 : 1 }}
         >
           {isGenerating ? 'Generating...' : '✨ Generate Speech'}
         </button>
       </div>

       {audioUrl && (
         <div style={{ marginTop: '24px', padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--color-success)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
           <h3 style={{ fontSize: '1.1rem', color: 'var(--color-success)' }}>Generation Successful!</h3>
           <audio controls src={audioUrl} style={{ width: '100%' }} />
         </div>
       )}
    </div>
  );
}
