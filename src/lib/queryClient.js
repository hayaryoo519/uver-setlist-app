import { QueryClient } from '@tanstack/react-query'

export const STALE_TIMES = {
  lives: 60_000,       // 1分（ライブ情報は変わりうる）
  songs: 600_000,      // 10分（楽曲データはほぼ不変）
  stats: 30_000,       // 30秒（動的集計）
  predictions: 30_000, // 30秒（リアルタイム性高い）
  attendance: 60_000,  // 1分
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})
