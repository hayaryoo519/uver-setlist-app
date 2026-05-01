import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES, queryClient } from '../../lib/queryClient'
import type { FollowStats, FollowToggleResponse } from '../../types/api'

export const useMyFollowStats = (enabled = true) =>
    useQuery({
        queryKey: queryKeys.follows.myStats,
        queryFn: () => apiClient.get<FollowStats>('/api/follows/my/stats'),
        staleTime: STALE_TIMES.follows,
        enabled,
    })

export const useFollowStats = (userId: number | string | undefined) =>
    useQuery({
        queryKey: queryKeys.follows.stats(userId!),
        queryFn: () => apiClient.get<FollowStats>(`/api/follows/stats/${userId}`),
        staleTime: STALE_TIMES.follows,
        enabled: !!userId,
    })

export const useToggleFollow = () =>
    useMutation({
        mutationFn: (userId: number | string) =>
            apiClient.post<FollowToggleResponse>(`/api/follows/${userId}`),
        onSuccess: (_, userId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.follows.stats(userId) })
            queryClient.invalidateQueries({ queryKey: queryKeys.follows.myStats })
            queryClient.invalidateQueries({ queryKey: queryKeys.userProfile.detail(userId) })
            queryClient.invalidateQueries({ queryKey: ['feed'] })
        },
    })
