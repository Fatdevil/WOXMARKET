'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function MarketplaceFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Internal states initialized from URL perfectly
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [tone, setTone] = useState(searchParams.get('tone') || '');
  const [lang, setLang] = useState(searchParams.get('lang') || '');
  const [useCase, setUseCase] = useState(searchParams.get('useCase') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');

  const debouncedQ = useDebounce(q, 400);

  // Re-sync internally if the user hits BACK/FORWARD in the browser
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setTone(searchParams.get('tone') || '');
    setLang(searchParams.get('lang') || '');
    setUseCase(searchParams.get('useCase') || '');
    setSort(searchParams.get('sort') || '');
  }, [searchParams]);

  const updateUrl = useCallback((updates: Record<string, string>) => {
    // Current URL params
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        // TWEAK: Auto-apply URL cleanup -> removes empty query params totally
        current.delete(key);
      }
    });

    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/marketplace${query}`, { scroll: false });
  }, [searchParams, router]);

  // Push debounced text search changes
  useEffect(() => {
    // Prevent pushing exact same state to avoid infinite loops
    if (debouncedQ !== (searchParams.get('q') || '')) {
       updateUrl({ q: debouncedQ });
    }
  }, [debouncedQ]); // eslint-disable-line

  const handleClear = () => {
    setQ('');
    setTone('');
    setLang('');
    setUseCase('');
    setSort('');
    router.push('/marketplace', { scroll: false });
  };

  const hasFilters = q || tone || lang || useCase || sort;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
      
      {/* Search Bar */}
      <div style={{ position: 'relative', flex: 1 }}>
        <input 
          type="text" 
          placeholder="Search voices, tones, or creators..." 
          className="input-field"
          style={{ width: '100%', paddingLeft: '40px' }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
      </div>

      {/* Selectors */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        
        <select 
          className="input-field" 
          value={useCase} 
          onChange={(e) => updateUrl({ useCase: e.target.value })}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <option value="">Any Category</option>
          <option value="Ads">Commercial / Ads</option>
          <option value="Audiobooks">Audiobooks</option>
          <option value="YouTube">YouTube / Video</option>
          <option value="Gaming">Gaming / Character</option>
          <option value="Podcasts">Podcasts</option>
        </select>

        <select 
          className="input-field" 
          value={tone} 
          onChange={(e) => updateUrl({ tone: e.target.value })}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <option value="">Any Tone</option>
          <option value="Energetic">Energetic</option>
          <option value="Calm">Calm</option>
          <option value="Corporate">Corporate</option>
          <option value="Storytelling">Storytelling</option>
        </select>

        <select 
          className="input-field" 
          value={lang} 
          onChange={(e) => updateUrl({ lang: e.target.value })}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <option value="">Any Language</option>
          <option value="en">English</option>
          <option value="sv">Swedish</option>
          <option value="es">Spanish</option>
        </select>

        <select 
          className="input-field" 
          value={sort} 
          onChange={(e) => updateUrl({ sort: e.target.value })}
          style={{ padding: '8px 16px', fontSize: '0.85rem', marginLeft: 'auto', background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.2)', color: 'var(--color-primary-light)', fontWeight: 600 }}
        >
          <option value="">Sort: Featured First</option>
          <option value="newest">Newest Voices</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>

        {hasFilters && (
           <button 
             onClick={handleClear} 
             style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', fontSize: '0.85rem', cursor: 'pointer', padding: '8px 12px' }}
           >
             Clear Selection
           </button>
        )}

      </div>
    </div>
  );
}
