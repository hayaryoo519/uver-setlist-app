// ライブ種別
export type LiveType = 'ONEMAN' | 'HALL' | 'ARENA' | 'LIVEHOUSE' | 'FESTIVAL' | 'EVENT'

// セットリスト1曲
export interface SetlistEntry {
  id: number
  title: string
  order: number
  is_encore?: boolean
  album?: string | null
  note?: string | null
  position?: number
}

// ライブ
export interface Live {
  id: number
  tour_name: string
  title: string | null
  date: string
  venue: string
  type: LiveType
  special_note: string | null
  setlist?: SetlistEntry[]
  attended_at?: string
  created_at?: string
  prediction_count?: number
  live_date?: string
}

// 楽曲
export interface Song {
  id: number
  title: string
  album: string | null
  release_year: number | null
  mv_url: string | null
  author: string | null
  image_url: string | null
  created_at?: string
}

// 楽曲統計（詳細ページ用）
export interface SongStats {
  total_performances: number
  lives?: Live[]
  performances?: Array<{ id: number; date: string; venue: string; tour_name: string; type: LiveType }>
  first_performed?: string
  last_performed?: string
  title?: string
  image_url?: string | null
  is_rare?: boolean
  days_since_last?: number | null
  play_rate?: number
  total_possible_lives?: number
  first_performed_at?: string | null
  album?: string | null
  mv_url?: string | null
}

// ユーザー
export type UserRole = 'user' | 'admin'

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  email_verified: boolean
  created_at: string
  is_public?: boolean
}

// 認証済みユーザー（AuthContext）
export interface AuthUser extends User {
  token?: string
}

// セトリ予想
export interface Prediction {
  id: number
  user_id: number
  live_id: number
  content: string
  like_count: number
  created_at: string
  username?: string
  liked_by_user?: boolean
  is_mine?: boolean
  is_liked?: boolean
  tour_name?: string
  live_date?: string
  venue?: string
  songs?: Array<{ id: number; title: string }>
}

// セトリ予想作成リクエスト
export interface CreatePredictionInput {
  live_id: number | null
  content?: string
  title?: string
  songs?: number[]
  song_ids?: number[]
}

// 修正依頼ステータス
export type CorrectionStatus = 'pending' | 'resolved' | 'rejected'

// 修正依頼
export interface Correction {
  id: number
  user_id: number
  live_date: string | null
  live_venue: string | null
  live_title: string | null
  correction_type: string
  description: string
  status: CorrectionStatus
  admin_note: string | null
  created_at: string
  username?: string
}

// 修正依頼作成リクエスト
export interface CorrectionInput {
  live_id?: number
  live_date?: string | null
  live_venue?: string | null
  live_title?: string | null
  correction_type: string
  description: string
  suggested_data?: any
}

// ライブ一覧フィルターパラメータ
export interface LivesParams {
  enabled?: boolean
  songIds?: number[]
  startDate?: string
  endDate?: string
  include_setlists?: boolean
  tour_name?: string
}

// 予想一覧フィルターパラメータ
export interface PredictionsParams {
  enabled?: boolean
  liveId?: number | string
  sort?: string
  mine?: boolean
}

// 楽曲画像レスポンス
export interface SongImageResponse {
  image_url: string | null
}

// フォロー統計
export interface FollowStats {
  following_count: number
  follower_count: number
  is_following?: boolean
}

export interface FollowToggleResponse {
  following: boolean
}

// フィードアイテム（フォロー中ユーザーの予想）
export interface FeedItem {
  id: number
  user_id: number
  live_id: number
  title: string
  created_at: string
  username: string
  tour_name: string
  venue: string
  live_date: string
  like_count: number
  is_liked: boolean
  is_mine: false
}

export interface FeedParams {
  limit?: number
  offset?: number
  enabled?: boolean
}

// 公開ユーザープロフィール
export interface PublicUserProfile {
  id: number
  username: string
  created_at: string
  following_count: number
  follower_count: number
  is_following: boolean
  is_public: boolean
}
