import { QueryClient } from '@tanstack/react-query'

export const STALE_TIMES = {
  lives: 60_000,       // 1分
  songs: 600_000,      // 10分
  stats: 30_000,       // 30秒
  predictions: 30_000, // 30秒
  attendance: 60_000,  // 1分
} as const

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})
