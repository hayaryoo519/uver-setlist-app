import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES } from '../../lib/queryClient'
import type { Live, LivesParams } from '../../types/api'

const buildLivesUrl = (params: Omit<LivesParams, 'enabled'> = {}): string => {
  const searchParams = new URLSearchParams()
  if (params.songIds?.length) searchParams.set('songIds', params.songIds.join(','))
  if (params.startDate) searchParams.set('startDate', params.startDate)
  if (params.endDate) searchParams.set('endDate', params.endDate)
  if (params.include_setlists) searchParams.set('include_setlists', 'true')
  if (params.tour_name) searchParams.set('tour_name', params.tour_name)
  const qs = searchParams.toString()
  return `/api/lives${qs ? `?${qs}` : ''}`
}

const filterValidLives = (data: Live[]): Live[] => {
  if (!Array.isArray(data)) return []
  return data
    .filter((live) => {
      if (!live.date) return false
      const year = new Date(live.date).getFullYear()
      return year > 1990 && year < 2100
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const useLives = (params: LivesParams = {}) => {
  const { enabled, ...queryParams } = params
  return useQuery({
    queryKey: queryKeys.lives.filtered(queryParams as Record<string, unknown>),
    queryFn: () => apiClient.get<Live[]>(buildLivesUrl(queryParams)),
    staleTime: STALE_TIMES.lives,
    select: filterValidLives,
    enabled: enabled !== false,
  })
}

export const useLiveDetail = (id: number | string | undefined) =>
  useQuery({
    queryKey: queryKeys.lives.detail(id),
    queryFn: () => apiClient.get<Live>(`/api/lives/${id}`),
    staleTime: STALE_TIMES.lives,
    enabled: !!id,
  })
