import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES } from '../../lib/queryClient'
import type { Song, SongStats, SongImageResponse } from '../../types/api'

export const useSongs = (options: { enabled?: boolean; includeDeleted?: boolean } = {}) =>
  useQuery({
    queryKey: options.includeDeleted ? [...queryKeys.songs.all, 'with-deleted'] : queryKeys.songs.all,
    queryFn: () => apiClient.get<Song[]>(`/api/songs${options.includeDeleted ? '?include_deleted=true' : ''}`),
    staleTime: STALE_TIMES.songs,
    enabled: options.enabled !== false,
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

export const useAlbumImage = (title: string | undefined, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ['album-image', title],
    queryFn: () => apiClient.get<SongImageResponse>(`/api/music/album-image/${encodeURIComponent(title!)}`),
    staleTime: STALE_TIMES.songs,
    enabled: !!title && options.enabled !== false,
  })

export const useSearchSongs = (query: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ['songs', 'search', query],
    queryFn: () => apiClient.get<Song[]>(`/api/songs?q=${encodeURIComponent(query)}`),
    staleTime: STALE_TIMES.songs,
    enabled: !!query && options.enabled !== false,
  })
