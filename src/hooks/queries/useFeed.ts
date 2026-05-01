import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES } from '../../lib/queryClient'
import type { FeedItem, FeedParams } from '../../types/api'

export const useFeed = (params: FeedParams = {}) => {
    const { enabled, ...queryParams } = params
    const { limit = 20, offset = 0 } = queryParams

    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(limit))
    searchParams.set('offset', String(offset))

    return useQuery({
        queryKey: queryKeys.feed.all(queryParams as Record<string, unknown>),
        queryFn: () =>
            apiClient.get<FeedItem[]>(`/api/feed?${searchParams.toString()}`),
        staleTime: STALE_TIMES.feed,
        enabled: enabled !== false,
    })
}
