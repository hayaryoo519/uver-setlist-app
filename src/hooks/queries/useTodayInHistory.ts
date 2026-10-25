import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES } from '../../lib/queryClient'
import type { TodayInHistoryData } from '../../types/api'

/**
 * 今日（JST）と同じ月日の過去ライブ・記念日を取得する React Query フック
 *
 * 取得先: GET /api/stats/today-in-history
 */
export const useTodayInHistory = () =>
  useQuery({
    queryKey: queryKeys.stats.todayInHistory,
    queryFn: () => apiClient.get<TodayInHistoryData>('/api/stats/today-in-history'),
    staleTime: STALE_TIMES.stats,
  })
