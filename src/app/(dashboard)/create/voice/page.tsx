'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AudioRecorder } from '@/components/audio/AudioRecorder';

interface VoiceDraft {
  audioFile: File | null;
  method: 'record' | 'upload' | null;
  enhancementPreset: 'clean' | 'warm' | 'bright' | null;
  title: string;
  description: string;
  language: string;
  tone: string;
  useCases: string[];
  subscriptionPrice: number | null;
  consent: boolean;
}

export default function CreateVoiceFunnel() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [draft, setDraft] = useState<VoiceDraft>({
    audioFile: null,
    method: null,
    enhancementPreset: null,
    title: '',
    description: '',
    language: 'en',
    tone: '',
    useCases: [],
    subscriptionPrice: null,
    consent: false
  });

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const toggleUseCase = (useCase: string) => {
    setDraft(prev => ({
      ...prev,
      useCases: prev.useCases.includes(useCase) 
        ? prev.useCases.filter(u => u !== useCase)
        : [...prev.useCases, useCase]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.audioFile || !draft.consent || !draft.title) return;
    
    setLoading(true);

    try {
      // 1. Create the voice record in DB
      const res = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          language: draft.language,
          tone: draft.tone,
          useCases: draft.useCases,
          enhancementPreset: draft.enhancementPreset,
          subscriptionPrice: draft.subscriptionPrice,
          consentText: "I confirm that I own this voice or have explicit rights to monetize it.",
        }),
      });

      if (!res.ok) throw new Error('Failed to create voice');
      const { voiceId } = await res.json();

      // 2. Upload the audio file to train endpoint
      const formData = new FormData();
      formData.append('audio', draft.audioFile);
      
      await fetch(`/api/voices/${voiceId}/upload`, {
        method: 'POST',
        body: formData,
      });

      // 3. Navigate to detail page
      router.push(`/voices/${voiceId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to process voice. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2rem', fontWeight: 800 }}>Create New Voice</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Turn your voice into a recurring revenue stream.</p>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          {[1,2,3,4,5].map(i => (
            <div 
              key={i} 
              style={{ 
                flex: 1, 
                height: '6px', 
                borderRadius: '3px', 
                background: step >= i ? 'var(--color-primary)' : 'var(--glass-bg)',
                transition: 'background 0.3s'
              }} 
            />
          ))}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px', textAlign: 'right' }}>
          Step {step} of 5
        </div>
      </header>

      {/* Step 1: Record/Upload */}
      {step === 1 && (
        <div className="glass-panel" style={{ padding: '40px', animation: 'fadeIn 0.3s' }}>
          <h2 style={{ marginBottom: '24px' }}>1. Capture your voice</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Clear, high-quality audio yields the best AI model. Read naturally.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <button 
              className="glass-panel"
              style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: draft.method === 'record' ? '2px solid var(--color-primary)' : '1px solid var(--border-light)' }}
              onClick={() => setDraft(prev => ({ ...prev, method: 'record' }))}
            >
              <div style={{ fontSize: '2.5rem' }}>🎙️</div>
              <h3 style={{ fontSize: '1.2rem' }}>Record in Browser</h3>
            </button>
            <button 
              className="glass-panel"
              style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: draft.method === 'upload' ? '2px solid var(--color-primary)' : '1px solid var(--border-light)' }}
              onClick={() => setDraft(prev => ({ ...prev, method: 'upload' }))}
            >
              <div style={{ fontSize: '2.5rem' }}>📁</div>
              <h3 style={{ fontSize: '1.2rem' }}>Upload Audio File</h3>
            </button>
          </div>

          {draft.method === 'record' && (
            <AudioRecorder 
              onRecordingComplete={(file) => setDraft(prev => ({ ...prev, audioFile: file }))} 
            />
          )}

          {draft.method === 'upload' && (
            <div style={{ padding: '40px', border: '2px dashed var(--border-light)', borderRadius: '12px', textAlign: 'center' }}>
               <input 
                 type="file" 
                 accept="audio/*" 
                 onChange={(e) => {
                   if (e.target.files && e.target.files[0]) {
                     setDraft(prev => ({ ...prev, audioFile: e.target.files![0] }));
                   }
                 }} 
               />
               <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '16px' }}>Max file size: 10MB (.wav or .mp3)</p>
               {draft.audioFile && <p style={{ color: 'var(--color-success)', marginTop: '8px', fontWeight: 600 }}>File attached: {draft.audioFile.name}</p>}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleNext} 
              disabled={!draft.audioFile}
            >
              Next Step
            </button>
          </div>
        </div>
      )}

      {/* Step 2: AI Enhancement */}
      {step === 2 && (
        <div className="glass-panel" style={{ padding: '40px', animation: 'fadeIn 0.3s' }}>
          <h2 style={{ marginBottom: '24px' }}>2. Enhance your voice ✨</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Select an AI processing preset to maximize the quality of your clone.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { id: 'clean', label: 'Clean Studio', desc: 'Removes background noise and applies professional EQ. (Recommended)', icon: '🎧' },
              { id: 'warm', label: 'Warm & Deep', desc: 'Enhances lower frequencies perfect for narration and podcasts.', icon: '🎙️' },
              { id: 'bright', label: 'Bright & Clear', desc: 'Crisp presence boost, ideal for ads and YouTube videos.', icon: '✨' }
            ].map(preset => (
              <button 
                key={preset.id}
                className="glass-panel"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '20px', padding: '24px', textAlign: 'left',
                  border: draft.enhancementPreset === preset.id ? '2px solid var(--color-primary)' : '1px solid var(--border-light)',
                  background: draft.enhancementPreset === preset.id ? 'rgba(124, 58, 237, 0.05)' : 'transparent'
                }}
                onClick={() => setDraft(prev => ({ ...prev, enhancementPreset: preset.id as any }))}
              >
                <div style={{ fontSize: '2rem' }}>{preset.icon}</div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{preset.label}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>{preset.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
            <button className="btn btn-secondary" onClick={handleBack}>Back</button>
            <button 
              className="btn btn-primary" 
              onClick={handleNext} 
              disabled={!draft.enhancementPreset}
            >
              Next Step
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Voice Profile */}
      {step === 3 && (
        <div className="glass-panel" style={{ padding: '40px', animation: 'fadeIn 0.3s' }}>
          <h2 style={{ marginBottom: '24px' }}>3. Voice Profile</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="input-group">
              <label className="input-label">Voice Name</label>
              <input 
                className="input-field" 
                placeholder="e.g. Smooth Late Night Radio"
                value={draft.title}
                onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea 
                className="input-field" 
                placeholder="Describe pacing, character, and vibe..."
                rows={3}
                value={draft.description}
                onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="input-group">
                <label className="input-label">Language</label>
                <select className="input-field" value={draft.language} onChange={e => setDraft(prev => ({ ...prev, language: e.target.value }))}>
                  <option value="en">English (US)</option>
                  <option value="en-gb">English (UK)</option>
                  <option value="sv">Swedish</option>
                  <option value="es">Spanish</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Primary Tone</label>
                <select className="input-field" value={draft.tone} onChange={e => setDraft(prev => ({ ...prev, tone: e.target.value }))}>
                  <option value="" disabled>Select Tone...</option>
                  <option value="Energetic">Energetic</option>
                  <option value="Calm">Calm</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Storytelling">Storytelling</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Best Used For (Select multiple)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {['Ads', 'YouTube', 'Audiobooks', 'Gaming', 'Podcasts', 'Meditation'].map(useCase => (
                  <button 
                    key={useCase}
                    onClick={() => toggleUseCase(useCase)}
                    style={{
                      padding: '8px 16px', borderRadius: '50px', fontSize: '0.9rem',
                      background: draft.useCases.includes(useCase) ? 'var(--color-primary)' : 'var(--glass-bg)',
                      color: draft.useCases.includes(useCase) ? '#fff' : 'var(--text-primary)',
                      border: draft.useCases.includes(useCase) ? '1px solid var(--color-primary)' : '1px solid var(--border-light)'
                    }}
                  >
                    {useCase}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
            <button className="btn btn-secondary" onClick={handleBack}>Back</button>
            <button 
              className="btn btn-primary" 
              onClick={handleNext} 
              disabled={!draft.title || !draft.tone || draft.useCases.length === 0}
            >
              Next Step
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Pricing */}
      {step === 4 && (
        <div className="glass-panel" style={{ padding: '40px', animation: 'fadeIn 0.3s' }}>
          <h2 style={{ marginBottom: '24px' }}>4. Set Your Price</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Creators earn 30% from every monthly subscriber. Higher prices yield higher individual earnings, whilst lower prices drive faster adoption.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            {[
              { price: 9, label: 'Starter', desc: 'Best for faster adoption and volume.' },
              { price: 19, label: 'Standard', desc: 'Recommended balance of volume and value.', recommended: true },
              { price: 29, label: 'Premium', desc: 'For highly specialized, unique voices.' }
            ].map(tier => (
              <div 
                key={tier.price}
                className="glass-panel"
                style={{ 
                  padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', cursor: 'pointer',
                  border: draft.subscriptionPrice === tier.price ? '2px solid var(--color-primary)' : '1px solid var(--border-light)',
                  position: 'relative',
                  background: draft.subscriptionPrice === tier.price ? 'rgba(124, 58, 237, 0.05)' : 'transparent'
                }}
                onClick={() => setDraft(prev => ({ ...prev, subscriptionPrice: tier.price }))}
              >
                {tier.recommended && (
                   <span style={{ position: 'absolute', top: '-12px', background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600 }}>RECOMMENDED</span>
                )}
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{tier.label}</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>${tier.price}<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mo</span></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{tier.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
            <button className="btn btn-secondary" onClick={handleBack}>Back</button>
            <button 
              className="btn btn-primary" 
              onClick={handleNext} 
              disabled={!draft.subscriptionPrice}
            >
              Review Configuration
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <div className="glass-panel" style={{ padding: '40px', animation: 'fadeIn 0.3s' }}>
          <h2 style={{ marginBottom: '24px' }}>5. Review & Submit</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
             <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{draft.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>{draft.description}</div>
                
                <div style={{ display: 'flex', gap: '24px', marginTop: '24px', fontSize: '0.9rem' }}>
                   <div><strong style={{ color: 'var(--text-secondary)' }}>Tone:</strong> {draft.tone}</div>
                   <div><strong style={{ color: 'var(--text-secondary)' }}>Language:</strong> {draft.language.toUpperCase()}</div>
                   <div><strong style={{ color: 'var(--text-secondary)' }}>Enhancement:</strong> {draft.enhancementPreset}</div>
                </div>
                
                <div style={{ marginTop: '16px' }}>
                  <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Use Cases:</strong>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                     {draft.useCases.map(u => <span key={u} style={{ background: 'var(--glass-bg)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem' }}>{u}</span>)}
                  </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Monthly Price</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>${draft.subscriptionPrice}</div>
                </div>
             </div>

             <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ color: 'var(--color-warning)', fontSize: '1rem', marginBottom: '8px' }}>Moderation Period</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Your voice will be reviewed by our Trust & Safety team before going live in the marketplace.
                </p>
             </div>

             <div style={{ background: 'rgba(220, 38, 38, 0.05)', border: '1px solid rgba(220, 38, 38, 0.2)', padding: '20px', borderRadius: '12px' }}>
              <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={draft.consent}
                  onChange={e => setDraft(prev => ({ ...prev, consent: e.target.checked }))}
                  style={{ marginTop: '4px', transform: 'scale(1.2)' }}
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  I confirm that I am the sole owner of this voice and hold all necessary monetization rights.
                </span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handleBack} disabled={loading}>Back to Edits</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSubmit} 
              disabled={!draft.consent || loading}
            >
              {loading ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}
      <style jsx>{`
         @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
         }
      `}</style>
    </div>
  );
}
