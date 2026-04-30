import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { STALE_TIMES } from '../../lib/queryClient'

export const useAttendedLives = (enabled = true) =>
  useQuery({
    queryKey: ['attendance', 'attended-lives'],
    queryFn: () => apiClient.get('/api/users/me/attended_lives'),
    staleTime: STALE_TIMES.attendance,
    enabled,
  })
