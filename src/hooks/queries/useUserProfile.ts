import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES } from '../../lib/queryClient'
import type { PublicUserProfile, Live, FeedItem } from '../../types/api'

export const usePublicUserProfile = (userId: number | string | undefined) =>
    useQuery({
        queryKey: queryKeys.userProfile.detail(userId!),
        queryFn: () => apiClient.get<PublicUserProfile>(`/api/users/${userId}/profile`),
        staleTime: STALE_TIMES.follows,
        enabled: !!userId,
    })

export const useUserAttendedLives = (userId: number | string | undefined, enabled = true) =>
    useQuery({
        queryKey: queryKeys.userProfile.attendedLives(userId!),
        queryFn: () => apiClient.get<Live[]>(`/api/users/${userId}/attended_lives`),
        staleTime: STALE_TIMES.attendance,
        enabled: !!userId && enabled,
    })

export const useUserPredictions = (userId: number | string | undefined) =>
    useQuery({
        queryKey: queryKeys.userProfile.predictions(userId!),
        queryFn: () => apiClient.get<FeedItem[]>(`/api/users/${userId}/predictions`),
        staleTime: STALE_TIMES.predictions,
        enabled: !!userId,
    })
