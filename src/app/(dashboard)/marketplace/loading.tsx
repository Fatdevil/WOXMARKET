export default function MarketplaceLoading() {
  return (
    <div style={{ paddingBottom: '100px' }}>
      
      {/* Featured Section Skeleton */}
      <div style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '250px', height: '36px', background: 'var(--bg-card)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={`featured-skeleton-${i}`} className="glass-panel" style={{ padding: '24px', height: '300px', display: 'flex', flexDirection: 'column', animation: 'pulse 1.5s infinite' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                 <div style={{ width: '80px', height: '24px', background: 'var(--bg-primary)', borderRadius: '50px' }} />
                 <div style={{ width: '40px', height: '40px', background: 'var(--bg-primary)', borderRadius: '50%' }} />
               </div>
               <div style={{ width: '80%', height: '28px', background: 'var(--bg-primary)', borderRadius: '4px', marginBottom: '16px' }} />
               <div style={{ width: '100%', height: '60px', background: 'var(--bg-primary)', borderRadius: '4px', marginBottom: '24px' }} />
               <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                 <div style={{ width: '100px', height: '32px', background: 'var(--bg-primary)', borderRadius: '4px' }} />
                 <div style={{ width: '120px', height: '38px', background: 'var(--bg-primary)', borderRadius: '50px' }} />
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Title & Filters Skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ width: '200px', height: '36px', background: 'var(--bg-card)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
        <div style={{ flex: 1, height: '48px', background: 'var(--bg-card)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: '200px', height: '48px', background: 'var(--bg-card)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
      </div>

      {/* Standard Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
         {[...Array(6)].map((_, i) => (
           <div key={`grid-skeleton-${i}`} className="glass-panel" style={{ padding: '24px', height: '300px', display: 'flex', flexDirection: 'column', animation: 'pulse 1.5s infinite' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
               <div style={{ width: '80px', height: '24px', background: 'var(--bg-primary)', borderRadius: '50px' }} />
               <div style={{ width: '40px', height: '40px', background: 'var(--bg-primary)', borderRadius: '50%' }} />
             </div>
             <div style={{ width: '70%', height: '28px', background: 'var(--bg-primary)', borderRadius: '4px', marginBottom: '16px' }} />
             <div style={{ width: '90%', height: '40px', background: 'var(--bg-primary)', borderRadius: '4px', marginBottom: '24px' }} />
             <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
               <div style={{ width: '80px', height: '32px', background: 'var(--bg-primary)', borderRadius: '4px' }} />
             </div>
           </div>
         ))}
      </div>

    </div>
  );
}
