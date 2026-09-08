import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ExternalLink, FileText, Loader, RefreshCw, Send } from 'lucide-react'
import { apiClient } from '../../../lib/apiClient'
import { useLives } from '../../../hooks/queries/useLives'

type PostType = 'on_this_day' | 'frequent_ranking' | 'rare_song' | 'seasonal' | 'tour_stats'
type SocialPost = { id: number; body: string; status: 'draft' | 'approved' | 'published' | 'failed'; post_type: PostType; external_post_url?: string; published_at?: string; live_tour_name?: string; live_venue?: string }

const TYPES: Array<{ value: PostType; label: string }> = [
  { value: 'on_this_day', label: 'On This Day' },
  { value: 'frequent_ranking', label: '頻出曲ランキング' },
  { value: 'rare_song', label: 'レア曲紹介' },
  { value: 'seasonal', label: '季節ネタ' },
  { value: 'tour_stats', label: 'ツアー統計' },
]
const STATUS_LABEL = { draft: '下書き', approved: 'チェック済み', published: '投稿済み', failed: '失敗' }

const AdminSocialPostsTab = () => {
  const { data: lives = [] } = useLives({ include_setlists: true }) as { data: any[] }
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [postType, setPostType] = useState<PostType>('on_this_day')
  const [tourName, setTourName] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [editedBodies, setEditedBodies] = useState<Record<number, string>>({})
  const [postUrls, setPostUrls] = useState<Record<number, string>>({})

  const tours = useMemo(() => [...new Set(lives.map(live => live.tour_name).filter(Boolean))], [lives])
  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try { setPosts(await apiClient.get<SocialPost[]>('/api/social-posts')) }
    catch (err: any) { setMessage(err.data?.message || '投稿候補の取得に失敗しました') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchPosts() }, [fetchPosts])

  const generate = async () => {
    if (postType === 'tour_stats' && !tourName) return
    setGenerating(true); setMessage('')
    try {
      await apiClient.post('/api/social-posts/generate', { postType, tourName: postType === 'tour_stats' ? tourName : undefined })
      setMessage('投稿候補を生成しました')
      await fetchPosts()
    } catch (err: any) { setMessage(err.data?.message || '投稿候補の生成に失敗しました') }
    finally { setGenerating(false) }
  }

  const updatePost = async (post: SocialPost, body: string, status?: 'draft' | 'approved') => {
    try {
      const updated = await apiClient.patch<SocialPost>(`/api/social-posts/${post.id}`, { body, status })
      setPosts(current => current.map(item => item.id === post.id ? updated : item))
    } catch (err: any) { setMessage(err.data?.message || '投稿候補の更新に失敗しました') }
  }

  const openXComposer = (post: SocialPost) => {
    const body = editedBodies[post.id] ?? post.body
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer')
  }

  const markPublished = async (post: SocialPost) => {
    setMessage('')
    try {
      const updated = await apiClient.post<SocialPost>(`/api/social-posts/${post.id}/publish`, { postUrl: postUrls[post.id] || '' })
      setPosts(current => current.map(item => item.id === post.id ? updated : item))
      setPostUrls(current => ({ ...current, [post.id]: '' }))
      setMessage('投稿済みに更新しました')
    } catch (err: any) { setMessage(err.data?.message || '投稿済みへの更新に失敗しました') }
  }

  return <div className="tab-content fade-in">
    <div className="table-header-panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Send size={20} /> X投稿コンテンツ</h2>
      <button className="btn-secondary" onClick={fetchPosts} disabled={loading}><RefreshCw size={16} />更新</button>
    </div>
    <div className="collect-panel" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <select value={postType} onChange={e => setPostType(e.target.value as PostType)} style={{ flex: '1 1 220px', minWidth: 0, background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: 6, padding: 10 }}>
        {TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
      </select>
      {postType === 'tour_stats' && <select value={tourName} onChange={e => setTourName(e.target.value)} style={{ flex: '1 1 260px', minWidth: 0, background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: 6, padding: 10 }}>
        <option value="">ツアーを選択...</option>{tours.map(tour => <option key={tour} value={tour}>{tour}</option>)}
      </select>}
      <button className="btn-primary" onClick={generate} disabled={generating || (postType === 'tour_stats' && !tourName)}>{generating ? <Loader className="spin" size={16} /> : <FileText size={16} />}投稿下書きを生成</button>
    </div>
    {message && <p style={{ color: '#fbbf24' }}>{message}</p>}
    {loading ? <Loader className="spin" /> : posts.length === 0 ? <p style={{ color: '#94a3b8' }}>投稿候補はありません。</p> : posts.map(post => <div key={post.id} className="collect-panel" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10, color: '#94a3b8', fontSize: 13 }}><span>{TYPES.find(type => type.value === post.post_type)?.label || post.post_type}</span><span>{STATUS_LABEL[post.status]}</span></div>
      <textarea value={editedBodies[post.id] ?? post.body} maxLength={280} rows={8} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#0f172a', color: '#f8fafc', border: '1px solid #475569', borderRadius: 6, padding: 10 }} onChange={e => setEditedBodies(current => ({ ...current, [post.id]: e.target.value }))} onBlur={e => { if (e.target.value !== post.body) updatePost(post, e.target.value) }} />
      {post.status === 'draft' && <button className="btn-primary" style={{ marginTop: 10 }} onClick={() => updatePost(post, editedBodies[post.id] ?? post.body, 'approved')}><Check size={16} />チェック済みにする</button>}
      {post.status === 'approved' && <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        <button className="btn-primary" onClick={() => openXComposer(post)}><ExternalLink size={16} />Xで投稿</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="url" value={postUrls[post.id] || ''} placeholder="投稿後のX URL" onChange={e => setPostUrls(current => ({ ...current, [post.id]: e.target.value }))} style={{ flex: '1 1 280px', minWidth: 0, background: '#0f172a', color: '#f8fafc', border: '1px solid #475569', borderRadius: 6, padding: 10 }} />
          <button className="btn-secondary" onClick={() => markPublished(post)} disabled={!postUrls[post.id]}><Check size={16} />投稿済みにする</button>
        </div>
      </div>}
      {post.status === 'published' && post.external_post_url && <a href={post.external_post_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ marginTop: 10, display: 'inline-flex' }}><ExternalLink size={16} />Xで確認</a>}
    </div>)}
  </div>
}

export default AdminSocialPostsTab
