import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES } from '../../lib/queryClient'
import type { Song, SongStats, SongImageResponse } from '../../types/api'

export const useSongs = () =>
  useQuery({
    queryKey: queryKeys.songs.all,
    queryFn: () => apiClient.get<Song[]>('/api/songs'),
    staleTime: STALE_TIMES.songs,
  })

export const useSongDetail = (id: number | string | undefined) =>
  useQuery({
    queryKey: queryKeys.songs.detail(id),
    queryFn: () => apiClient.get<Song>(`/api/songs/${id}`),
    staleTime: STALE_TIMES.songs,
    enabled: !!id,
  })

export const useSongStats = (id: number | string | undefined) => {
  const encodedId = id ? encodeURIComponent(id.toString().replace(/\s+/g, '')) : null
  return useQuery({
    queryKey: [...queryKeys.songs.detail(id), 'stats'],
    queryFn: () => apiClient.get<SongStats>(`/api/songs/${encodedId}/stats`),
    staleTime: STALE_TIMES.songs,
    enabled: !!id,
  })
}

export const useSongImage = (title: string | undefined, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ['song-image', title],
    queryFn: () => apiClient.get<SongImageResponse>(`/api/music/song-image/${encodeURIComponent(title!)}`),
    staleTime: STALE_TIMES.songs,
    enabled: !!title && options.enabled !== false,
  })
