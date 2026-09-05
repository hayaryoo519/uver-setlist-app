import React, { useCallback, useEffect, useState } from 'react'
import { Check, FileText, Loader, RefreshCw, Send } from 'lucide-react'
import { apiClient } from '../../../lib/apiClient'
import { useLives } from '../../../hooks/queries/useLives'

type SocialPost = {
  id: number
  body: string
  status: 'draft' | 'approved' | 'published' | 'failed'
  live_tour_name?: string
  live_venue?: string
  live_date?: string
}

const STATUS_LABEL: Record<SocialPost['status'], string> = {
  draft: '下書き', approved: '承認済み', published: '投稿済み', failed: '失敗',
}

const AdminSocialPostsTab = () => {
  const { data: lives = [] } = useLives({ include_setlists: true }) as { data: any[] }
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [liveId, setLiveId] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [editedBodies, setEditedBodies] = useState<Record<number, string>>({})

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      setPosts(await apiClient.get<SocialPost[]>('/api/social-posts'))
    } catch (err: any) {
      setMessage(err.data?.message || '投稿候補の取得に失敗しました')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const generate = async () => {
    if (!liveId) return
    setGenerating(true); setMessage('')
    try {
      await apiClient.post('/api/social-posts/generate', { liveId: Number(liveId) })
      setMessage('投稿候補を生成しました')
      await fetchPosts()
    } catch (err: any) {
      setMessage(err.data?.message || '投稿候補の生成に失敗しました')
    } finally { setGenerating(false) }
  }

  const updatePost = async (post: SocialPost, body: string, status?: SocialPost['status']) => {
    try {
      const updated = await apiClient.patch<SocialPost>(`/api/social-posts/${post.id}`, { body, status })
      setPosts(current => current.map(item => item.id === post.id ? updated : item))
    } catch (err: any) { setMessage(err.data?.message || '投稿候補の更新に失敗しました') }
  }

  return <div className="tab-content fade-in">
    <div className="table-header-panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Send size={20} /> X投稿候補</h2>
      <button className="btn-secondary" onClick={fetchPosts} disabled={loading}><RefreshCw size={16} />更新</button>
    </div>
    <div className="collect-panel" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <select value={liveId} onChange={e => setLiveId(e.target.value)} style={{ flex: '1 1 280px', minWidth: 0, background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: 6, padding: 10 }}>
        <option value="">セットリストから候補を生成...</option>
        {lives.filter(live => live.setlist?.length || live.setlist_count).map(live => <option key={live.id} value={live.id}>{live.date} {live.tour_name || live.title} @ {live.venue}</option>)}
      </select>
      <button className="btn-primary" onClick={generate} disabled={!liveId || generating}>{generating ? <Loader className="spin" size={16} /> : <FileText size={16} />}候補を生成</button>
    </div>
    {message && <p style={{ color: '#fbbf24' }}>{message}</p>}
    {loading ? <Loader className="spin" /> : posts.length === 0 ? <p style={{ color: '#94a3b8' }}>投稿候補はありません。</p> : posts.map(post => <div key={post.id} className="collect-panel" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10, color: '#94a3b8', fontSize: 13 }}>
        <span>{post.live_tour_name || 'ライブ'} {post.live_venue ? `@ ${post.live_venue}` : ''}</span>
        <span>{STATUS_LABEL[post.status]}</span>
      </div>
      <textarea value={editedBodies[post.id] ?? post.body} maxLength={280} rows={8} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#0f172a', color: '#f8fafc', border: '1px solid #475569', borderRadius: 6, padding: 10 }} onChange={e => setEditedBodies(current => ({ ...current, [post.id]: e.target.value }))} onBlur={e => { if (e.target.value !== post.body) updatePost(post, e.target.value) }} />
      {post.status === 'draft' && <button className="btn-primary" style={{ marginTop: 10 }} onClick={() => updatePost(post, editedBodies[post.id] ?? post.body, 'approved')}><Check size={16} />承認する</button>}
    </div>)}
  </div>
}

export default AdminSocialPostsTab
