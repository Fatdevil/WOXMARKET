'use client';

import { useEffect, useRef } from 'react';

export function PublicPageViewTracker({ voiceId }: { voiceId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'public_page_view', voiceId })
      }).catch(() => {});
    }
  }, [voiceId]);

  return null;
}
