export const queryKeys = {
  lives: {
    all: ['lives'] as const,
    filtered: (params: Record<string, unknown>) => ['lives', params] as const,
    detail: (id: number | string | undefined) => ['live', id] as const,
  },
  songs: {
    all: ['songs'] as const,
    detail: (id: number | string | undefined) => ['song', id] as const,
  },
  predictions: {
    all: (params: Record<string, unknown>) => ['predictions', params] as const,
    byLive: (liveId: number | string) => ['predictions', 'live', liveId] as const,
    detail: (id: number | string) => ['prediction', id] as const,
  },
  attendance: {
    mine: ['attendance', 'mine'] as const,
  },
  stats: {
    global: ['stats', 'global'] as const,
  },
}
