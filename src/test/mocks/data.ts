import type { Live, Song, Prediction, Correction, User } from '../../types/api'

export const mockSongs: Song[] = [
  { id: 1, title: 'IMPACT', album: 'Timeless', release_year: 2006, mv_url: null, author: null, image_url: null },
  { id: 2, title: 'ODE TO MY FAMILY', album: 'BUGRIGHT', release_year: 2007, mv_url: null, author: null, image_url: null },
  { id: 3, title: 'SHAMROCK', album: 'PROGLUTION', release_year: 2008, mv_url: null, author: null, image_url: null },
]

export const mockLives: Live[] = [
  {
    id: 1,
    tour_name: 'UVERworld LIVE TOUR 2024',
    title: null,
    date: '2024-03-15T00:00:00.000Z',
    venue: '日本武道館',
    type: 'ONEMAN',
    special_note: null,
    setlist: [
      { id: 1, title: 'IMPACT', order: 1 },
      { id: 2, title: 'ODE TO MY FAMILY', order: 2 },
    ],
  },
  {
    id: 2,
    tour_name: 'UVERworld LIVE TOUR 2023',
    title: null,
    date: '2023-11-20T00:00:00.000Z',
    venue: 'さいたまスーパーアリーナ',
    type: 'ARENA',
    special_note: null,
    setlist: [],
  },
]

export const mockPredictions: Prediction[] = [
  {
    id: 1,
    user_id: 10,
    live_id: 1,
    content: '1曲目はIMPACTだと思う',
    like_count: 5,
    created_at: '2024-03-01T00:00:00.000Z',
    username: 'testuser',
    liked_by_user: false,
  },
  {
    id: 2,
    user_id: 11,
    live_id: 1,
    content: 'SHAMROCKで始まりそう',
    like_count: 2,
    created_at: '2024-03-02T00:00:00.000Z',
    username: 'user2',
    liked_by_user: true,
  },
]

export const mockUser: User = {
  id: 10,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  email_verified: true,
  created_at: '2024-01-01T00:00:00.000Z',
}

export const mockCorrections: Correction[] = [
  {
    id: 1,
    user_id: 10,
    live_date: '2024-03-15',
    live_venue: '日本武道館',
    live_title: null,
    correction_type: 'setlist',
    description: 'アンコールにSHAMROCKが抜けています',
    status: 'pending',
    admin_note: null,
    created_at: '2024-03-20T00:00:00.000Z',
    username: 'testuser',
  },
]
