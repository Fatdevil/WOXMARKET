import prisma from '@/lib/prisma';
import { VoiceCard } from '@/components/marketplace/VoiceCard';
import { MarketplaceFilters } from '@/components/marketplace/MarketplaceFilters';

export default async function MarketplacePage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const resolvedParams = await searchParams;
  const { lang, q, tone, useCase, sort } = resolvedParams;

  // Strict Fail-closed baseline
  const whereClause: any = {
    visibility: 'public',
    status: 'ready',
    moderationStatus: 'approved'
  };

  if (lang) whereClause.language = lang;
  if (tone) whereClause.tone = tone;
  if (useCase) whereClause.useCase = { contains: useCase }; // Since useCases are stringified JSON arrays

  if (q) {
    whereClause.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { useCase: { contains: q, mode: 'insensitive' } },
      { creator: { displayName: { contains: q, mode: 'insensitive' } } }
    ];
  }

  // Determine standard Prisma ordering
  const orderBy: any[] = [];
  if (sort === 'newest') orderBy.push({ publishedAt: 'desc' });
  else if (sort === 'price_asc') orderBy.push({ subscriptionPrice: 'asc' });
  else if (sort === 'price_desc') orderBy.push({ subscriptionPrice: 'desc' });
  
  // Always fallback to highest ranking
  orderBy.push({ listing: { featuredRank: 'desc' } });

  const voices = await prisma.voice.findMany({
    where: whereClause,
    include: {
      creator: { select: { displayName: true } },
      listing: true
    },
    orderBy
  });

  // TWEAK 2: Client-side Relevancy Boost Logic (if search or filters exist)
  // We boost featured and newly created items to bubble them up organically unless strictly sorted
  let sortedVoices = voices;
  if (!sort) {
      sortedVoices = voices.toSorted((a: any, b: any) => {
         let scoreA = 0;
         let scoreB = 0;
         
         // Featured Boost
         if ((a.listing?.featuredRank ?? 0) > 0) scoreA += 10;
         if ((b.listing?.featuredRank ?? 0) > 0) scoreB += 10;

         // Freshness Boost (< 7 days)
         const now = new Date().getTime();
         const sevenDays = 7 * 24 * 60 * 60 * 1000;
         if (a.publishedAt && (now - new Date(a.publishedAt).getTime() < sevenDays)) scoreA += 5;
         if (b.publishedAt && (now - new Date(b.publishedAt).getTime() < sevenDays)) scoreB += 5;
         
         // Exact Tone Match Boost (if querying q without picking tone)
         if (q && a.tone && a.tone.toLowerCase().includes(q.toLowerCase())) scoreA += 15;
         if (q && b.tone && b.tone.toLowerCase().includes(q.toLowerCase())) scoreB += 15;

         return scoreB - scoreA;
      });
  }

  // TWEAK 3: No-results Fallback Strategy
  const noMatch = sortedVoices.length === 0 && Object.keys(resolvedParams).length > 0;
  let fallbackVoices: any[] = [];
  
  if (noMatch) {
     fallbackVoices = await prisma.voice.findMany({
        where: { visibility: 'public', status: 'ready', moderationStatus: 'approved' },
        include: { creator: { select: { displayName: true } }, listing: true },
        orderBy: [{ listing: { featuredRank: 'desc' } }, { publishedAt: 'desc' }],
        take: 3
     });
  }

  // Separation (Featured vs All) only if no active search/filters
  const isDefaultView = Object.keys(resolvedParams).length === 0;
  const featuredVoices = isDefaultView ? sortedVoices.filter((v: any) => (v.listing?.featuredRank ?? 0) > 0).slice(0, 3) : [];
  const regularVoices = isDefaultView ? sortedVoices.filter((v: any) => !featuredVoices.find((fv: any) => fv.id === v.id)) : sortedVoices;

  return (
    <div style={{ paddingBottom: '100px' }}>
      
      <MarketplaceFilters />

      {featuredVoices.length > 0 && (
        <div style={{ marginBottom: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
             <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>🔥 Featured Voices</h2>
             <span style={{ color: 'var(--text-secondary)' }}>Top tier creators</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
             {featuredVoices.map((voice: any) => (
                <VoiceCard key={voice.id} voice={voice} />
             ))}
          </div>
        </div>
      )}

      {isDefaultView && regularVoices.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
           <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-outfit)', margin: 0 }}>All Voices</h2>
        </div>
      )}
      
      {!isDefaultView && regularVoices.length > 0 && (
        <div style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
           Found {regularVoices.length} voice{regularVoices.length !== 1 ? 's' : ''} matching your search.
        </div>
      )}

      {/* Main Grid Render */}
      {!noMatch && (
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
           {regularVoices.map((voice: any) => <VoiceCard key={voice.id} voice={voice} />)}
         </div>
      )}

      {/* Empty State Clean Catch */}
      {!isDefaultView && noMatch && fallbackVoices.length === 0 && (
         <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
           <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
           <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '8px' }}>No voices match your filters</h3>
           <p>Try removing filters or expanding your search terms.</p>
         </div>
      )}

      {/* Empty State True Empty (No voices in DB) */}
      {isDefaultView && sortedVoices.length === 0 && (
         <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
           <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎙️</div>
           <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px' }}>No voices are live yet</h3>
           <p>Check back soon once creator voices pass moderation.</p>
         </div>
      )}

      {/* Session Rescue Empty State */}
      {noMatch && fallbackVoices.length > 0 && (
         <div style={{ padding: '60px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-light)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
               <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
               <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '8px' }}>No exact matches</h3>
               <p style={{ color: 'var(--text-secondary)' }}>Try removing filters or expanding your search terms.</p>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '32px', textAlign: 'left' }}>
               <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', textAlign: 'center' }}>Since you're here, checkout these trending voices:</h3>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                 {fallbackVoices.map((voice: any) => <VoiceCard key={voice.id} voice={voice} />)}
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
