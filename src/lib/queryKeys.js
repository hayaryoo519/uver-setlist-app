export const queryKeys = {
  lives: {
    all: ['lives'],
    filtered: (params) => ['lives', params],
    detail: (id) => ['live', id],
  },
  songs: {
    all: ['songs'],
    detail: (id) => ['song', id],
  },
  predictions: {
    all: (params) => ['predictions', params],
    byLive: (liveId) => ['predictions', 'live', liveId],
    detail: (id) => ['prediction', id],
  },
  attendance: {
    mine: ['attendance', 'mine'],
  },
  stats: {
    global: ['stats', 'global'],
  },
}
