import React, { useState, useMemo } from 'react';
import { Loader, Plus, Search, Edit2, Trash2, ArrowUpDown, X, RotateCcw } from 'lucide-react';
import { Youtube as YoutubeIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSongs } from '../../../hooks/queries/useSongs';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';
import { queryKeys } from '../../../lib/queryKeys';
import type { Song } from '../../../types/api';

const ALBUM_RELEASE_YEAR: Record<string, number> = {
    'Timeless': 2006, 'BUGRIGHT': 2007, 'PROGLUTION': 2008, 'AwakEVE': 2009,
    'LAST': 2010, 'LIFE 6 SENSE': 2011, 'THE ONE': 2012, 'Ø CHOIR': 2014,
    'TYCOON': 2017, 'UNSER': 2019, '30': 2021, 'ENIGMASIS': 2023, 'EPIPHANY': 2025,
    'Single': 9999,
};

const emptyForm = { title: '', album: '', release_year: '', mv_url: '', author: '', spotify_track_id: '', yt_video_id: '' };

const AdminSongsTab = () => {
    const [showDeleted, setShowDeleted] = useState(false);
    const { data: songs = [], isLoading } = useSongs({ includeDeleted: showDeleted });
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [albumFilter, setAlbumFilter] = useState('ALL');
    const [spotifyFilter, setSpotifyFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED'>('ALL');
    const [youtubeFilter, setYoutubeFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED'>('ALL');
    const [sortConfig, setSortConfig] = useState({ key: 'release', direction: 'asc' });

    const [showModal, setShowModal] = useState(false);
    const [editingSong, setEditingSong] = useState<Song | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [isBulkMapping, setIsBulkMapping] = useState(false);

    const uniqueAlbums = useMemo(() => {
        const albums = songs.map(s => s.album).filter(Boolean) as string[];
        return [...new Set(albums)].sort((a, b) => a.localeCompare(b, 'ja'));
    }, [songs]);

    const processed = useMemo(() => {
        let items = [...songs];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(s => s.title.toLowerCase().includes(lower) || (s.album && s.album.toLowerCase().includes(lower)));
        }
        if (albumFilter !== 'ALL') items = items.filter(s => s.album === albumFilter);
        if (spotifyFilter === 'LINKED') items = items.filter(s => !!s.spotify_track_id);
        else if (spotifyFilter === 'UNLINKED') items = items.filter(s => !s.spotify_track_id);
        if (youtubeFilter === 'LINKED') items = items.filter(s => !!s.yt_video_id);
        else if (youtubeFilter === 'UNLINKED') items = items.filter(s => !s.yt_video_id);

        items.sort((a, b) => {
            if (sortConfig.key === 'id') {
                const r = Number(a.id) - Number(b.id);
                return sortConfig.direction === 'asc' ? r : -r;
            }
            if (sortConfig.key === 'release') {
                const aY = ALBUM_RELEASE_YEAR[a.album as string] ?? 10000;
                const bY = ALBUM_RELEASE_YEAR[b.album as string] ?? 10000;
                const r = aY - bY;
                return sortConfig.direction === 'asc' ? r : -r;
            }
            const aVal = (a as any)[sortConfig.key] || '';
            const bVal = (b as any)[sortConfig.key] || '';
            const r = String(aVal).localeCompare(String(bVal), 'ja');
            return sortConfig.direction === 'asc' ? r : -r;
        });
        return items;
    }, [songs, searchTerm, albumFilter, spotifyFilter, youtubeFilter, sortConfig]);

    const invalidateSongs = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
    };

    const openAdd = () => { setEditingSong(null); setFormData(emptyForm); setShowModal(true); };
    const openEdit = (song: Song) => {
        setEditingSong(song);
        setFormData({
            title: song.title, album: song.album || '', release_year: song.release_year != null ? String(song.release_year) : '',
            mv_url: song.mv_url || '', author: song.author || '', spotify_track_id: song.spotify_track_id || '', yt_video_id: song.yt_video_id || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            release_year: formData.release_year === '' ? null : parseInt(formData.release_year),
            album: formData.album || null, mv_url: formData.mv_url || null,
            author: formData.author || null, spotify_track_id: formData.spotify_track_id || null, yt_video_id: formData.yt_video_id || null,
        };
        try {
            if (editingSong) {
                await apiClient.put(`/api/songs/${editingSong.id}`, payload);
            } else {
                await apiClient.post('/api/songs', payload);
            }
            invalidateSongs();
            setShowModal(false);
        } catch (err) {
            alert(`Failed to save song: ${(err as any).data?.message || (err as any).message}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('この曲を削除しますか？\nセトリデータは保持されます（論理削除）。')) return;
        try {
            await apiClient.delete(`/api/songs/${id}`);
            invalidateSongs();
        } catch (err) {
            alert((err as any).data?.message || '削除に失敗しました');
        }
    };

    const handleRestore = async (id: number) => {
        try {
            await apiClient.patch(`/api/songs/${id}/restore`, {});
            invalidateSongs();
        } catch (err) {
            alert((err as any).data?.message || '復元に失敗しました');
        }
    };

    const handleSpotifyAutoSearch = async (song: Song) => {
        try {
            const res: any = await apiClient.post('/api/spotify/auto-map-song', { songId: song.id });
            if (res.success) { alert(`Successfully mapped to: ${res.track.name}`); invalidateSongs(); }
            else alert("No match found on Spotify.");
        } catch { alert("Error during Spotify auto-search"); }
    };

    const handleYoutubeAutoSearch = async (song: Song) => {
        try {
            const res: any = await apiClient.post('/api/youtube/auto-map-song', { songId: song.id });
            if (res.success) { alert(`Successfully mapped to: ${res.video.title}`); invalidateSongs(); }
            else alert("No match found on YouTube.");
        } catch { alert("Error during YouTube auto-search"); }
    };

    const handleYoutubeBulkAutoMap = async () => {
        const unlinked = processed.filter(s => !s.yt_video_id);
        if (unlinked.length === 0) { alert("All visible songs are already linked to YouTube."); return; }
        if (!window.confirm(`Attempt to auto-map ${unlinked.length} songs on YouTube?`)) return;
        setIsBulkMapping(true);
        try {
            const res: any = await apiClient.post('/api/youtube/auto-map-batch', { songIds: unlinked.map(s => s.id) });
            alert(`Bulk Auto-Map Complete!\nSuccess: ${res.results.success}\nFailed: ${res.results.failed}\nSkipped: ${res.results.skipped}`);
            invalidateSongs();
        } catch { alert("Bulk mapping failed"); } finally { setIsBulkMapping(false); }
    };

    const handleSpotifyBulkAutoMap = async () => {
        const unlinked = processed.filter(s => !s.spotify_track_id);
        if (unlinked.length === 0) { alert("All visible songs are already linked to Spotify."); return; }
        if (!window.confirm(`Attempt to auto-map ${unlinked.length} songs on Spotify?`)) return;
        setIsBulkMapping(true);
        try {
            const res: any = await apiClient.post('/api/spotify/auto-map-batch', { songIds: unlinked.map(s => s.id) });
            alert(`Bulk Auto-Map Complete!\nSuccess: ${res.results.success}\nFailed: ${res.results.failed}\nSkipped: ${res.results.skipped}`);
            invalidateSongs();
        } catch { alert("Bulk mapping failed"); } finally { setIsBulkMapping(false); }
    };

    const toggleSort = (key: string) =>
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

    if (isLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader className="spin" size={32} color="var(--primary-color)" />
        </div>
    );

    return (
        <div className="tab-content fade-in">
            <div className="table-header-panel">
                <h3>Songs Master ({processed.length} / {songs.filter(s => !s.deleted_at).length}{showDeleted && ` + ${songs.filter(s => s.deleted_at).length}件削除済み`})</h3>
                <div className="admin-filter-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} className="search-icon" />
                        <input type="text" placeholder="Search songs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                    </div>
                    <select value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)} style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                        <option value="ALL">すべてのアルバム</option>
                        {uniqueAlbums.map(album => <option key={album} value={album}>{album}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {(['ALL', 'LINKED', 'UNLINKED'] as const).map(s => (
                            <button key={s} onClick={() => setSpotifyFilter(s)} style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: spotifyFilter === s ? '#1DB954' : '#334155', background: spotifyFilter === s ? 'rgba(29,185,84,0.15)' : '#0f172a', color: spotifyFilter === s ? '#1DB954' : '#94a3b8' }}>
                                {s === 'ALL' ? 'すべて' : s === 'LINKED' ? 'Spotify連携済' : '未連携'}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {(['ALL', 'LINKED', 'UNLINKED'] as const).map(s => (
                            <button key={s} onClick={() => setYoutubeFilter(s)} style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: youtubeFilter === s ? '#FF0000' : '#334155', background: youtubeFilter === s ? 'rgba(255,0,0,0.15)' : '#0f172a', color: youtubeFilter === s ? '#FF0000' : '#94a3b8' }}>
                                {s === 'ALL' ? 'YTすべて' : s === 'LINKED' ? 'YT連携済' : 'YT未連携'}
                            </button>
                        ))}
                    </div>
                    <select value={`${sortConfig.key}-${sortConfig.direction}`} onChange={(e) => { const [key, dir] = e.target.value.split('-'); setSortConfig({ key, direction: dir }); }} style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                        <option value="release-asc">公開順（古い→新しい）</option>
                        <option value="release-desc">公開順（新しい→古い）</option>
                        <option value="title-asc">タイトル A→Z</option>
                        <option value="title-desc">タイトル Z→A</option>
                        <option value="album-asc">アルバム A→Z</option>
                        <option value="album-desc">アルバム Z→A</option>
                        <option value="id-asc">ID 昇順</option>
                        <option value="id-desc">ID 降順</option>
                    </select>
                    <button
                        onClick={() => setShowDeleted(v => !v)}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: showDeleted ? '#ef4444' : '#334155', background: showDeleted ? 'rgba(239,68,68,0.15)' : '#0f172a', color: showDeleted ? '#ef4444' : '#94a3b8' }}
                    >
                        <Trash2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        {showDeleted ? '削除済みを隠す' : '削除済みを表示'}
                    </button>
                    <button className="btn-primary" style={{ width: 'auto' }} onClick={openAdd}><Plus size={18} /> Add Song</button>
                    <button className="btn-secondary" style={{ width: 'auto', borderColor: '#FF0000', color: '#FF0000', background: 'rgba(255,0,0,0.05)' }} onClick={handleYoutubeBulkAutoMap} disabled={isBulkMapping}>
                        {isBulkMapping ? <Loader className="spin" size={18} /> : <YoutubeIcon size={18} />} Bulk YT
                    </button>
                    {/* 
                    <button className="btn-secondary" style={{ width: 'auto', borderColor: '#1DB954', color: '#1DB954', background: 'rgba(29,185,84,0.05)' }} onClick={handleSpotifyBulkAutoMap} disabled={isBulkMapping}>
                        {isBulkMapping ? <Loader className="spin" size={18} /> : <Search size={18} />} Bulk Spotify
                    </button>
                    */}
                </div>
            </div>

            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }} className="sortable-th" onClick={() => toggleSort('id')}><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>ID<ArrowUpDown size={14} style={{ opacity: sortConfig.key === 'id' ? 1 : 0.3 }} /></span></th>
                            <th className="sortable-th" onClick={() => toggleSort('title')}><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Title<ArrowUpDown size={14} style={{ opacity: sortConfig.key === 'title' ? 1 : 0.3 }} /></span></th>
                            <th className="sortable-th" onClick={() => toggleSort('album')}><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Album<ArrowUpDown size={14} style={{ opacity: sortConfig.key === 'album' ? 1 : 0.3 }} /></span></th>
                            <th style={{ width: '120px' }}>Spotify ID</th>
                            <th style={{ width: '120px' }}>YouTube ID</th>
                            <th style={{ width: '140px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processed.map(song => {
                            const isDeleted = !!song.deleted_at;
                            return (
                                <tr key={song.id} style={isDeleted ? { opacity: 0.45 } : undefined}>
                                    <td style={{ color: '#94a3b8' }}>#{song.id}</td>
                                    <td style={{ fontWeight: 'bold' }}>
                                        {isDeleted
                                            ? <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{song.title}</span>
                                            : <Link to={`/song/${encodeURIComponent(song.title)}`} style={{ color: '#e2e8f0', textDecoration: 'none' }} className="hover-link">{song.title}</Link>
                                        }
                                    </td>
                                    <td style={{ color: '#64748b', fontSize: '0.9rem' }}>{song.album || '-'}</td>
                                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                        {song.spotify_track_id ? (
                                            <a href={`https://open.spotify.com/track/${song.spotify_track_id}`} target="_blank" rel="noreferrer" style={{ color: '#1DB954' }}>{song.spotify_track_id.slice(0, 8)}...</a>
                                        ) : <span style={{ color: '#475569' }}>-</span>}
                                    </td>
                                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                        {song.yt_video_id ? (
                                            <a href={`https://www.youtube.com/watch?v=${song.yt_video_id}`} target="_blank" rel="noreferrer" style={{ color: '#FF0000' }}>{song.yt_video_id.slice(0, 8)}...</a>
                                        ) : <span style={{ color: '#475569' }}>-</span>}
                                    </td>
                                    <td>
                                        <div className="actions-wrapper">
                                            {isDeleted ? (
                                                <button onClick={() => handleRestore(song.id)} className="action-btn" title="Restore" style={{ color: '#34d399' }}><RotateCcw size={18} /></button>
                                            ) : (
                                                <>
                                                    {/* <button onClick={() => handleSpotifyAutoSearch(song)} className="action-btn" title="Spotify Auto Search" style={{ color: '#1DB954' }}><Search size={18} /></button> */}
                                                    <button onClick={() => handleYoutubeAutoSearch(song)} className="action-btn" title="YouTube Auto Search" style={{ color: '#FF0000' }}><YoutubeIcon size={18} /></button>
                                                    <button onClick={() => openEdit(song)} className="action-btn edit" title="Edit"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(song.id)} className="action-btn delete" title="Delete"><Trash2 size={18} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {processed.length === 0 && <tr><td colSpan={6} className="empty-cell">No songs found.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Song Edit/Add Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">{editingSong ? 'Edit Song' : 'Add New Song'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label>Song Title</label><input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                            <div className="form-group"><label>Album</label><input type="text" value={formData.album} onChange={e => setFormData({ ...formData, album: e.target.value })} /></div>
                            <div className="form-group"><label>Release Year</label><input type="number" value={formData.release_year} onChange={e => setFormData({ ...formData, release_year: e.target.value })} /></div>
                            <div className="form-group"><label>Author (Lyrics/Music)</label><input type="text" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} /></div>
                            <div className="form-group"><label>MV URL</label><input type="text" placeholder="https://youtube.com/..." value={formData.mv_url} onChange={e => setFormData({ ...formData, mv_url: e.target.value })} /></div>
                            <div className="form-group"><label>Spotify Track ID</label><input type="text" placeholder="e.g. 4YmSTfA7m6P9N6YnN5n3pB" value={formData.spotify_track_id} onChange={e => setFormData({ ...formData, spotify_track_id: e.target.value })} /></div>
                            <div className="form-group"><label>YouTube Video ID</label><input type="text" placeholder="e.g. j_6S9Lia9Q0" value={formData.yt_video_id} onChange={e => setFormData({ ...formData, yt_video_id: e.target.value })} /></div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" className="btn-primary">Save Song</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSongsTab;
