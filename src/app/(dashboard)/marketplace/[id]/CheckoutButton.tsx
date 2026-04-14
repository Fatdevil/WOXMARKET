'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutButton({ voiceId, isGuest }: { voiceId: string, isGuest: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    if (isGuest) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ voiceId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start checkout');
      }

      const { url } = await res.json();
      
      // Redirect to Stripe
      window.location.href = url;

    } catch (err: any) {
      console.error(err);
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCheckout} 
      disabled={loading}
      className="btn btn-primary" 
      style={{ 
        width: '100%', 
        padding: '20px', 
        fontSize: '1.2rem', 
        borderRadius: '50px', 
        justifyContent: 'center', 
        boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'not-allowed' : 'pointer'
      }}
    >
      {loading ? 'Processing...' : 'Subscribe & Use Voice'}
    </button>
  );
}
