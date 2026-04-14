'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PublishVoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [voice, setVoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Form State
  const [category, setCategory] = useState('Gaming / Streaming');
  const [language, setLanguage] = useState('en');
  
  // Pricing Strategy (Simplified per user request)
  const [subscriptionPrice, setSubscriptionPrice] = useState('99');
  const [enableUsage, setEnableUsage] = useState(false);
  const [usagePrice, setUsagePrice] = useState('0.50');

  useEffect(() => {
    fetch(`/api/voices/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setVoice(data.voice);
        setLoading(false);
      });
  }, [params.id]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);

    try {
      const res = await fetch(`/api/voices/${params.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          language,
          priceType: enableUsage ? 'both' : 'subscription',
          subscriptionPrice: parseFloat(subscriptionPrice),
          usagePriceUnit: enableUsage ? parseFloat(usagePrice) : 0,
        })
      });

      if (!res.ok) throw new Error('Publish failed');
      
      router.push(`/marketplace/${params.id}`); // Redirect directly to the shiny new storefront page!
    } catch (err) {
      alert('Failed to publish. Try again.');
      setPublishing(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!voice) return <div>Voice not found.</div>;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ marginBottom: '40px' }}>
         <Link href={`/voices/${params.id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
            ← Back
         </Link>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800 }}>Publish to Marketplace</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Set your metadata and pricing strategy for "{voice.title}".</p>
      </header>

      <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Marketplace Classification */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Classification</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Storefront Category</label>
              <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Gaming / Streaming">Gaming / Streaming</option>
                <option value="Audiobooks / Narration">Audiobooks / Narration</option>
                <option value="Commercials / Ads">Commercials / Ads</option>
                <option value="Characters / Animation">Characters / Animation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Language</label>
              <select className="input-field" value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="en">English (US/UK)</option>
                <option value="sv">Swedish</option>
                <option value="de">German</option>
                <option value="es">Spanish</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing Strategy */}
        <div className="glass-panel" style={{ padding: '32px' }}>
           <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Pricing Strategy</h2>

           <div style={{ padding: '20px', border: '1px solid var(--color-primary)', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.05)', marginBottom: '24px' }}>
             <h3 style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
               <span>Monthly Subscription Price</span>
               <span>SEK / month</span>
             </h3>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
               Buyers will pay this flat fee every month to keep your voice in their library.
             </p>
             <input 
                type="number" 
                className="input-field" 
                value={subscriptionPrice}
                onChange={e => setSubscriptionPrice(e.target.value)}
                style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                min="0"
                required
             />
           </div>

           <div style={{ padding: '20px', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', marginBottom: enableUsage ? '16px' : '0' }}>
                <input 
                  type="checkbox" 
                  checked={enableUsage}
                  onChange={e => setEnableUsage(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--color-accent)' }}
                />
                <div>
                  <h3 style={{ margin: 0 }}>Enable extra usage credits (Pay-per-character)</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Charge power-users for additional characters beyond their base limit.</p>
                </div>
              </label>

              {enableUsage && (
                 <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                   <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                     <label className="input-label">Cost per 1k characters (SEK)</label>
                     <input 
                        type="number" 
                        step="0.10"
                        className="input-field" 
                        value={usagePrice}
                        onChange={e => setUsagePrice(e.target.value)}
                        min="0"
                     />
                   </div>
                 </div>
              )}
           </div>
        </div>

        {/* Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
            By publishing, you agree to our terms of service and confirm your content adheres to the Trust & Safety guidelines.
          </p>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '16px 32px', fontSize: '1.2rem', borderRadius: '50px' }}
            disabled={publishing}
          >
            {publishing ? 'Publishing...' : '🚀 Publish to Marketplace'}
          </button>
        </div>

      </form>
    </div>
  );
}
