'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ModerationStatusBadge } from '@/components/voice/ModerationStatusBadge';
import { ShareVoiceButton } from '@/components/voice/ShareVoiceButton';

export default function VoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [voice, setVoice] = useState<any>(null);
  const [trainingJob, setTrainingJob] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/voices/${params.id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setVoice(data.voice);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
      if (data.voice.trainingJobs?.[0]) {
        setTrainingJob(data.voice.trainingJobs[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Polling every 2s if not ready
    let interval: NodeJS.Timeout;
    if (voice?.status !== 'ready' && voice?.status !== 'failed') {
      interval = setInterval(fetchStatus, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [voice?.status]);

  if (loading) return <div>Loading...</div>;
  if (!voice) return <div>Voice not found.</div>;

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800 }}>{voice.title}</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ModerationStatusBadge status={voice.moderationStatus as any} visibility={voice.visibility} showHelper={false} />
            <span style={{ color: 'var(--text-secondary)' }}>{voice.description || 'No description provided.'}</span>
          </div>
        </div>
      </header>

      {/* Moderation Status Block */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', borderLeft: voice.moderationStatus === 'approved' && voice.visibility === 'public' ? '4px solid var(--color-success)' : (voice.moderationStatus === 'rejected' ? '4px solid var(--color-error)' : '4px solid var(--color-warning)') }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Moderation Status</h3>
        
        {voice.moderationStatus === 'pending' && (
          <p style={{ color: 'var(--text-secondary)' }}>Your voice is currently under review and is not yet visible in the marketplace.</p>
        )}
        
        {voice.moderationStatus === 'approved' && voice.visibility === 'public' && (
          <p style={{ color: 'var(--color-success)', fontWeight: 500 }}>Your voice is live and available to buyers.</p>
        )}
        
        {voice.moderationStatus === 'approved' && voice.visibility === 'private' && (
          <p style={{ color: 'var(--text-secondary)' }}>Your voice is approved but explicitly hidden from the marketplace.</p>
        )}

        {voice.moderationStatus === 'rejected' && (
          <div>
            <p style={{ color: 'var(--color-error)', fontWeight: 500, marginBottom: '12px' }}>Your voice was rejected and needs changes before resubmission.</p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <strong>Reason:</strong> {voice.moderationReason || 'Violates community guidelines.'}
            </div>
          </div>
        )}

        {(voice.visibility === 'private' && voice.moderationStatus !== 'pending' && voice.moderationStatus !== 'rejected' && voice.moderationStatus !== 'approved') && (
          <p style={{ color: 'var(--text-secondary)' }}>This voice is private and has not been submitted for marketplace review.</p>
        )}

        {/* Timestamps */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {voice.submittedAt && <div>Submitted: {formatDate(voice.submittedAt)}</div>}
          {voice.moderatedAt && <div>Reviewed: {formatDate(voice.moderatedAt)}</div>}
        </div>
      </div>

      {/* Tags */}
      {voice.tags && voice.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {voice.tags.map((tag: string) => (
            <span key={tag} style={{ background: 'var(--glass-bg)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Traning Pipeline Status */}
      {voice.status !== 'draft' && (
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>AI Model Training Pipeline</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {/* Background line */}
            <div style={{ position: 'absolute', top: '24px', left: '0', right: '0', height: '2px', background: 'var(--border-light)', zIndex: 0 }} />
            
            {/* Step 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card)', border: trainingJob?.preprocessingStatus === 'completed' ? '2px solid var(--color-success)' : '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {trainingJob?.preprocessingStatus === 'completed' ? '✓' : '1'}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Audio Processing</div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card)', border: trainingJob?.trainingStatus === 'completed' ? '2px solid var(--color-success)' : (trainingJob?.trainingStatus === 'processing' ? '2px solid var(--color-primary)' : '2px solid var(--border-light)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {trainingJob?.trainingStatus === 'completed' ? '✓' : '2'}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Model Cloning</div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '12px' }}>
               <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card)', border: voice.status === 'ready' ? '2px solid var(--color-success)' : '2px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {voice.status === 'ready' ? '✓' : '3'}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ready for Preview</div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {metrics && (
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', borderLeft: '4px solid var(--color-primary)' }}>
          <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📈</span> Performance & Earnings
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            *Estimated earnings based on active subscriptions and a 70/30 split.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Active Subscribers</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{metrics.subscribers.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Monthly Usage</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{metrics.charactersGeneratedThisMonth.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>chars</span></div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Total Calls</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{metrics.totalGenerations.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Est. Monthly Earnings*</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>${metrics.estimatedMonthlyEarnings.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <Link 
          href={`/voices/${voice.id}/preview`} 
          className={`btn ${voice.status === 'ready' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ opacity: voice.status === 'ready' ? 1 : 0.5, pointerEvents: voice.status === 'ready' ? 'auto' : 'none' }}
        >
          {voice.status === 'ready' ? '▶ Enter Preview Studio' : 'Preview (Waiting for Training)'}
        </Link>
        
        {voice.status === 'ready' && voice.visibility === 'private' && voice.moderationStatus !== 'pending' && voice.moderationStatus !== 'rejected' && voice.moderationStatus !== 'approved' && (
           <Link href={`/voices/${voice.id}/publish`} className="btn btn-secondary" style={{ marginLeft: 'auto' }}>
             🚀 Submit for Review
           </Link>
        )}
        
        {voice.status === 'ready' && voice.moderationStatus === 'pending' && (
           <div style={{ marginLeft: 'auto', padding: '12px 24px', background: 'var(--bg-card)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)', borderRadius: '50px', fontWeight: 600 }}>
             ⏳ Pending Admin Review
           </div>
        )}

        {voice.status === 'ready' && voice.moderationStatus === 'approved' && voice.visibility === 'public' && (
           <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <ShareVoiceButton voiceId={voice.id} />
              <Link href={`/marketplace/${voice.id}`} className="btn btn-primary" style={{ background: 'var(--color-success)', color: '#fff', border: 'none' }}>
                Live in Store
              </Link>
           </div>
        )}

        {voice.status === 'ready' && voice.moderationStatus === 'rejected' && (
           <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
             <button 
                onClick={async () => {
                  if (confirm("Are you sure you have resolved the issues and want to resubmit?")) {
                    const res = await fetch(`/api/voices/${voice.id}/resubmit`, { method: 'POST' });
                    if (res.ok) window.location.reload();
                    else alert("Failed to resubmit");
                  }
                }}
                className="btn btn-secondary" 
                style={{ color: 'var(--color-error)', border: '1px solid var(--color-error)', background: 'transparent' }}
             >
               Edit & Resubmit
             </button>
           </div>
        )}
      </div>

    </div>
  );
}
