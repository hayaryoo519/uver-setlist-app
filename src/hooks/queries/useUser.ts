import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { STALE_TIMES, queryClient } from '../../lib/queryClient'
import { queryKeys } from '../../lib/queryKeys'
import type { Live } from '../../types/api'

export const useAttendedLives = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.attendance.mine,
    queryFn: () => apiClient.get<Live[]>('/api/users/me/attended_lives'),
    staleTime: STALE_TIMES.attendance,
    enabled,
  })

export const useAddAttendance = () =>
  useMutation({
    mutationFn: (liveId: number) =>
      apiClient.post('/api/users/me/attended_lives', { liveId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.mine })
    },
  })

export const useRemoveAttendance = () =>
  useMutation({
    mutationFn: (liveId: number) =>
      apiClient.delete(`/api/users/me/attended_lives/${liveId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.mine })
    },
  })
