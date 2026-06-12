'use client';

import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// Some embedded/automated webviews report `navigator.onLine === false` (or never
// emit an `online` event), which leaves React Query stuck in `fetchStatus: 'paused'`
// and queries never resolve. Force the online flag on so fetches always run.
if (typeof window !== 'undefined') {
  onlineManager.setOnline(true);
}

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // `networkMode: 'always'` is a second guard against the same issue:
          // run fetches regardless of the (sometimes wrong) online heuristic.
          queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1, networkMode: 'always' },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
