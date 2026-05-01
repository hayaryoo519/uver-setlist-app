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
  follows: {
    myStats: ['follows', 'my', 'stats'] as const,
    stats:   (userId: number | string) => ['follows', 'stats', userId] as const,
  },
  feed: {
    all: (params: Record<string, unknown>) => ['feed', params] as const,
  },
  userProfile: {
    detail:        (userId: number | string) => ['user', 'profile', userId] as const,
    attendedLives: (userId: number | string) => ['user', 'attended', userId] as const,
    predictions:   (userId: number | string) => ['user', 'predictions', userId] as const,
  },
}
