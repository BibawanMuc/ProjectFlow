import { QueryClient } from '@tanstack/react-query';

// Create and configure the React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data is considered fresh (5 minutes)
      staleTime: 1000 * 60 * 5,

      // Cache time: How long inactive data stays in cache (10 minutes)
      gcTime: 1000 * 60 * 10,

      // Retry failed requests
      retry: 1,

      // Refetch on window focus (useful for real-time updates)
      refetchOnWindowFocus: false,

      // Show errors in UI
      throwOnError: false,
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
    },
  },
});
