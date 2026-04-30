import { http, HttpResponse } from 'msw'
import { mockLives, mockSongs, mockPredictions, mockCorrections } from './data'

export const handlers = [
  // ライブ一覧
  http.get('/api/lives', () => {
    return HttpResponse.json(mockLives)
  }),

  // ライブ詳細
  http.get('/api/lives/:id', ({ params }) => {
    const live = mockLives.find((l) => l.id === Number(params.id))
    if (!live) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(live)
  }),

  // 楽曲一覧
  http.get('/api/songs', () => {
    return HttpResponse.json(mockSongs)
  }),

  // 楽曲詳細
  http.get('/api/songs/:id', ({ params }) => {
    const song = mockSongs.find((s) => s.id === Number(params.id))
    if (!song) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(song)
  }),

  // 楽曲統計
  http.get('/api/songs/:id/stats', ({ params }) => {
    return HttpResponse.json({
      total_performances: 3,
      lives: mockLives.slice(0, 2),
      first_performed: '2020-01-01',
      last_performed: '2024-03-15',
    })
  }),

  // 楽曲画像
  http.get('/api/music/song-image/:title', () => {
    return HttpResponse.json({ image_url: 'https://example.com/image.jpg' })
  }),
  
  // アルバム画像
  http.get('/api/music/album-image/:title', () => {
    return HttpResponse.json({ image_url: 'https://example.com/image.jpg' })
  }),

  // セトリ予想一覧
  http.get('/api/predictions', () => {
    return HttpResponse.json(mockPredictions)
  }),

  // セトリ予想対象ライブ
  http.get('/api/predictions/lives', () => {
    return HttpResponse.json(mockLives)
  }),

  // セトリ予想いいね
  http.post('/api/predictions/:id/like', () => {
    return HttpResponse.json({ message: 'ok' })
  }),

  // セトリ予想作成
  http.post('/api/predictions', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ id: 99, ...body, like_count: 0, created_at: new Date().toISOString() }, { status: 201 })
  }),

  // 参加ライブ一覧
  http.get('/api/users/me/attended_lives', () => {
    return HttpResponse.json(mockLives)
  }),

  // 修正依頼一覧
  http.get('/api/corrections', () => {
    return HttpResponse.json({ corrections: mockCorrections })
  }),

  // 修正依頼作成
  http.post('/api/corrections', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ id: 99, ...body, status: 'pending' }, { status: 201 })
  }),
]
