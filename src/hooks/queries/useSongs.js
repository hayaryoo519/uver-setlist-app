import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES } from '../../lib/queryClient'

export const useSongs = () =>
  useQuery({
    queryKey: queryKeys.songs.all,
    queryFn: () => apiClient.get('/api/songs'),
    staleTime: STALE_TIMES.songs,
  })

export const useSongDetail = (id) =>
  useQuery({
    queryKey: queryKeys.songs.detail(id),
    queryFn: () => apiClient.get(`/api/songs/${id}`),
    staleTime: STALE_TIMES.songs,
    enabled: !!id,
  })
