'use client';

import { useState, useEffect } from 'react';

export function EarningsHistoryTable({ creatorId }: { creatorId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 15;

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const offset = (page - 1) * limit;
        const res = await fetch(`/api/creator/earnings/history?status=${status}&source=${source}&limit=${limit}&offset=${offset}`);
        const data = await res.json();
        
        if (data.data) {
          setLogs(data.data);
          setTotal(data.meta.total);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [status, source, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Full Earnings Ledger</h2>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '6px' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="available">Available</option>
            <option value="paid">Paid</option>
          </select>
          
          <select 
            value={source} 
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '6px' }}
          >
            <option value="all">All Sources</option>
            <option value="subscription">Subscriptions</option>
            <option value="overage">Overage</option>
          </select>
        </div>
      </div>

      <div style={{ minHeight: '300px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading ledger...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No earnings found matching these filters.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-secondary)' }}>Date</th>
                <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Voice</th>
                <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Source</th>
                <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Amount (Net)</th>
                <th style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px 24px', fontSize: '0.9rem' }}>
                    <div>{new Date(log.occurredAt).toLocaleDateString()}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{new Date(log.occurredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{log.voice.title}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem',
                      background: log.sourceType === 'subscription' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: log.sourceType === 'subscription' ? '#818cf8' : 'var(--color-success)',
                      textTransform: 'capitalize'
                    }}>
                      {log.sourceType}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>${(log.creatorAmount / 100).toFixed(2)}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', textTransform: 'uppercase',
                      background: log.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : log.status === 'available' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 165, 0, 0.1)',
                      color: log.status === 'paid' ? 'var(--color-success)' : log.status === 'available' ? '#818cf8' : 'var(--color-warning)'
                    }}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && total > limit && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="btn btn-secondary" 
              style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              Prev
            </button>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="btn btn-secondary" 
              style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
