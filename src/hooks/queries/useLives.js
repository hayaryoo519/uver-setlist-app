import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES } from '../../lib/queryClient'

const buildLivesUrl = (params = {}) => {
  const searchParams = new URLSearchParams()
  if (params.songIds?.length) searchParams.set('songIds', params.songIds.join(','))
  if (params.startDate) searchParams.set('startDate', params.startDate)
  if (params.endDate) searchParams.set('endDate', params.endDate)
  if (params.include_setlists) searchParams.set('include_setlists', 'true')
  const qs = searchParams.toString()
  return `/api/lives${qs ? `?${qs}` : ''}`
}

const filterValidLives = (data) => {
  if (!Array.isArray(data)) return []
  return data
    .filter((live) => {
      if (!live.date) return false
      const year = new Date(live.date).getFullYear()
      return year > 1990 && year < 2100
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

export const useLives = (params = {}) =>
  useQuery({
    queryKey: queryKeys.lives.filtered(params),
    queryFn: () => apiClient.get(buildLivesUrl(params)),
    staleTime: STALE_TIMES.lives,
    select: filterValidLives,
  })

export const useLiveDetail = (id) =>
  useQuery({
    queryKey: queryKeys.lives.detail(id),
    queryFn: () => apiClient.get(`/api/lives/${id}`),
    staleTime: STALE_TIMES.lives,
    enabled: !!id,
  })
