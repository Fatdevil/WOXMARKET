'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PayoutActions({ readyCount, availableTotal }: { readyCount: number, availableTotal: number }) {
  const router = useRouter();
  const [loadingRelease, setLoadingRelease] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  async function handleRelease() {
    if (!confirm(`This will release ${readyCount} pending earnings that are past the 7-day hold. Proceed?`)) return;
    
    setLoadingRelease(true);
    try {
      const res = await fetch('/api/admin/payouts/release', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      router.refresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoadingRelease(false);
    }
  }

  async function handleDraft() {
    if (availableTotal <= 0) {
      alert('No available funds to batch.');
      return;
    }
    
    if (!confirm(`This will freeze all available earnings and draft a new payout batch. Proceed?`)) return;

    setLoadingDraft(true);
    try {
      const res = await fetch('/api/admin/payouts/create', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Admin drafted batch' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      router.push(`/admin/payouts/${data.batchId}`);
    } catch (err: any) {
      alert('Error drafting batch: ' + err.message);
    } finally {
      setLoadingDraft(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      <button 
        onClick={handleRelease} 
        disabled={loadingRelease || readyCount === 0}
        className="btn btn-secondary" 
        style={{ padding: '8px 16px', borderRadius: '8px', opacity: readyCount === 0 ? 0.5 : 1 }}
      >
        {loadingRelease ? 'Releasing...' : `Release Holds (${readyCount})`}
      </button>

      <button 
        onClick={handleDraft} 
        disabled={loadingDraft || availableTotal === 0}
        className="btn btn-primary" 
        style={{ padding: '8px 16px', borderRadius: '8px', background: '#818cf8', opacity: availableTotal === 0 ? 0.5 : 1 }}
      >
        {loadingDraft ? 'Drafting...' : 'Draft Payout Run'}
      </button>
    </div>
  );
}
