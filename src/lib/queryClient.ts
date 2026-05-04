import { QueryClient } from '@tanstack/react-query'

export const STALE_TIMES = {
  lives: 10 * 60_000,  // 10分（静的データ）
  songs: 10 * 60_000,  // 10分（静的データ）
  stats: 10 * 60_000,  // 10分（静的データ）
  predictions: 60_000, // 1分（ユーザー依存）
  attendance: 60_000,  // 1分（ユーザー依存）
  follows: 30_000,    // 30秒
  feed: 30_000,       // 30秒
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
