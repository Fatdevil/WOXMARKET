'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BatchActions({ batchId, status }: { batchId: string, status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleExecute() {
    if (status === 'completed') return;
    
    if (!confirm(`WARNING: This marks all earnings in this batch as PAID internally. Ensure you actually distributed funds outside first, or are doing so right now! Proceed?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payouts/execute`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert('Batch Executed! Ledger updated.');
      router.refresh();
    } catch (err: any) {
      alert('Error executing batch: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <a 
        href={`/api/admin/payouts/${batchId}/export`} 
        download
        className="btn btn-secondary" 
        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        Export CSV
      </a>

      {status !== 'completed' && (
        <button 
          onClick={handleExecute} 
          disabled={loading}
          className="btn btn-primary" 
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--color-success)' }}
        >
          {loading ? 'Executing...' : 'Execute Payout'}
        </button>
      )}
    </div>
  );
}
