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

export const useSongStats = (id) => {
  const encodedId = id ? encodeURIComponent(id.toString().replace(/\s+/g, '')) : null
  return useQuery({
    queryKey: [...queryKeys.songs.detail(id), 'stats'],
    queryFn: () => apiClient.get(`/api/songs/${encodedId}/stats`),
    staleTime: STALE_TIMES.songs,
    enabled: !!id,
  })
}

export const useSongImage = (title, options = {}) =>
  useQuery({
    queryKey: ['song-image', title],
    queryFn: () => apiClient.get(`/api/music/song-image/${encodeURIComponent(title)}`),
    staleTime: STALE_TIMES.songs,
    enabled: !!title && options.enabled !== false,
  })
