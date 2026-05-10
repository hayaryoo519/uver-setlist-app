import React, { useState, useMemo, useEffect } from 'react';
import { Loader, Plus, Search, Edit2, Trash2, ArrowUpDown, Check, ChevronUp, ChevronDown, ListMusic, BellRing, X } from 'lucide-react';
import { useLives } from '../../../hooks/queries/useLives';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { apiClient } from '../../../lib/apiClient';
import type { Live } from '../../../types/api';
import SetlistEditor from '../SetlistEditor';

const emptyLiveForm = { tour_name: '', title: '', date: '', venue: '', type: 'ONEMAN', special_note: '' };

type SetlistStatusFilter = 'ALL' | 'NORMAL' | 'UNKNOWN_SETLIST';

const AdminLivesTab = ({ initialEditId }: { initialEditId?: number }) => {
    const { data: lives = [], isLoading } = useLives({ include_setlists: true });
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [yearFilter, setYearFilter] = useState('ALL');
    const [setlistStatusFilter, setSetlistStatusFilter] = useState<SetlistStatusFilter>('ALL');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingLives, setIsDeletingLives] = useState(false);

    const [showLiveModal, setShowLiveModal] = useState(false);
    const [editingLive, setEditingLive] = useState<Live | null>(null);
    const [liveFormData, setLiveFormData] = useState(emptyLiveForm);

    const [showSetlistEditor, setShowSetlistEditor] = useState(false);
    const [selectedLiveForSetlist, setSelectedLiveForSetlist] = useState<Live | null>(null);

    const invalidateLives = () => queryClient.invalidateQueries({ queryKey: queryKeys.lives.all });

    const uniqueYears = useMemo(() => {
        const years = lives.map(l => new Date(l.date).getFullYear());
        return [...new Set(years)].sort((a, b) => b - a);
    }, [lives]);

    const processed = useMemo(() => {
        let items = [...lives];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(l =>
                l.tour_name.toLowerCase().includes(lower) ||
                l.venue.toLowerCase().includes(lower) ||
                (l.title && l.title.toLowerCase().includes(lower)) ||
                (l.special_note && l.special_note.toLowerCase().includes(lower))
            );
        }
        if (yearFilter !== 'ALL') {
            const y = parseInt(yearFilter);
            items = items.filter(l => new Date(l.date).getFullYear() === y);
        }
        if (setlistStatusFilter === 'NORMAL') {
            items = items.filter(l => !l.setlist_status || l.setlist_status === 'NORMAL');
        } else if (setlistStatusFilter === 'UNKNOWN_SETLIST') {
            items = items.filter(l => l.setlist_status === 'UNKNOWN_SETLIST');
        }
        items.sort((a, b) => {
            const aVal = (a as any)[sortConfig.key] || '';
            const bVal = (b as any)[sortConfig.key] || '';
            if (sortConfig.key === 'date') {
                const r = new Date(aVal).getTime() - new Date(bVal).getTime();
                return sortConfig.direction === 'asc' ? r : -r;
            }
            const r = String(aVal).localeCompare(String(bVal), 'ja');
            return sortConfig.direction === 'asc' ? r : -r;
        });
        return items;
    }, [lives, searchTerm, yearFilter, setlistStatusFilter, sortConfig]);

    // Deep link: open edit modal when initialEditId is provided
    useEffect(() => {
        if (initialEditId && lives.length > 0) {
            const live = lives.find(l => l.id === initialEditId);
            if (live) openEditLive(live);
        }
    }, [initialEditId, lives]);

    const toggleSort = (key: string) =>
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

    const toggleSelection = (id: number) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const toggleSelectAll = () =>
        setSelectedIds(selectedIds.length === processed.length ? [] : processed.map(l => l.id));

    const openAddLive = () => { setEditingLive(null); setLiveFormData(emptyLiveForm); setShowLiveModal(true); };
    const openEditLive = (live: Live) => {
        setEditingLive(live);
        setLiveFormData({
            tour_name: live.tour_name,
            title: live.title || '',
            date: new Date(live.date).toLocaleDateString('en-CA'),
            venue: live.venue,
            type: live.type || 'ONEMAN',
            special_note: live.special_note || '',
        });
        setShowLiveModal(true);
    };
    const openSetlistEditor = (live: Live) => { setSelectedLiveForSetlist(live); setShowSetlistEditor(true); };

    const handleLiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingLive) {
                await apiClient.put(`/api/lives/${editingLive.id}`, liveFormData);
            } else {
                await apiClient.post('/api/lives', liveFormData);
            }
            invalidateLives();
            setShowLiveModal(false);
            setEditingLive(null);
            setLiveFormData(emptyLiveForm);
        } catch (err) {
            alert(`Failed to save live: ${(err as any).data?.message || (err as any).message}`);
        }
    };

    const handleDeleteLive = async (id: number) => {
        if (!window.confirm("Delete this live event?")) return;
        try {
            await apiClient.delete(`/api/lives/${id}`);
            invalidateLives();
        } catch { alert('Failed to delete live'); }
    };

    const executeDeleteSelected = async () => {
        setShowDeleteConfirm(false);
        setIsDeletingLives(true);
        try {
            const data: any = await apiClient.post('/api/lives/batch-delete', { ids: selectedIds });
            alert(`Successfully deleted ${data.count} lives.`);
            setSelectedIds([]);
            invalidateLives();
        } catch (err) {
            alert(`Error during bulk delete: ${(err as any).data?.message || (err as any).message}`);
        } finally {
            setIsDeletingLives(false);
        }
    };

    const handleManualPush = async (live: Live) => {
        const msg = `「${live.title || live.tour_name}」のプッシュ通知を送信しますか？\n\n日付: ${live.date}\n会場: ${live.venue}`;
        if (!window.confirm(msg)) return;
        try {
            const data: any = await apiClient.post('/api/push/notify-live', { liveId: live.id });
            alert(`Notification sent!\nSuccess: ${data.details.sent}\nFailed: ${data.details.failed}`);
        } catch (err) {
            alert(`Failed to send notification: ${(err as any).data?.message || (err as any).message}`);
        }
    };

    const SortIcon = ({ key: k }: { key: string }) =>
        sortConfig.key === k
            ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
            : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;

    if (isLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader className="spin" size={32} color="var(--primary-color)" />
        </div>
    );

    return (
        <div className="tab-content fade-in">
            <div className="table-header-panel">
                <h3>Live Events</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {selectedIds.length > 0 && (
                        <button className="btn-primary" style={{ width: 'auto', background: '#ef4444', color: '#fff' }} onClick={() => setShowDeleteConfirm(true)} disabled={isDeletingLives}>
                            {isDeletingLives ? <Loader className="spin" size={18} /> : <Trash2 size={18} />} Delete Selected ({selectedIds.length})
                        </button>
                    )}
                    <button className="btn-primary" style={{ width: 'auto' }} onClick={openAddLive}><Plus size={18} /> Add New Live</button>
                </div>
            </div>

            <div className="admin-filter-row" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} className="search-icon" />
                    <input type="text" placeholder="Search lives..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                </div>
                <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                    <option value="ALL">All Years</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {(['ALL', 'NORMAL', 'UNKNOWN_SETLIST'] as const).map(s => (
                        <button key={s} onClick={() => setSetlistStatusFilter(s)} style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: setlistStatusFilter === s ? (s === 'UNKNOWN_SETLIST' ? '#f59e0b' : '#22c55e') : '#334155', background: setlistStatusFilter === s ? (s === 'UNKNOWN_SETLIST' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)') : '#0f172a', color: setlistStatusFilter === s ? (s === 'UNKNOWN_SETLIST' ? '#f59e0b' : '#22c55e') : '#94a3b8' }}>
                            {s === 'ALL' ? 'すべて' : s === 'NORMAL' ? 'セトリあり' : '未登録'}
                        </button>
                    ))}
                </div>
                <select value={`${sortConfig.key}-${sortConfig.direction}`} onChange={(e) => { const [key, dir] = e.target.value.split('-'); setSortConfig({ key, direction: dir }); }} style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                    <option value="date-desc">Date (Newest)</option>
                    <option value="date-asc">Date (Oldest)</option>
                    <option value="tour_name-asc">Tour (A-Z)</option>
                    <option value="tour_name-desc">Tour (Z-A)</option>
                    <option value="venue-asc">Venue (A-Z)</option>
                    <option value="venue-desc">Venue (Z-A)</option>
                </select>
            </div>

            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px', padding: '0 10px', textAlign: 'center' }}>
                                <div onClick={toggleSelectAll} style={{ width: '18px', height: '18px', border: '1px solid #64748b', borderRadius: '4px', cursor: 'pointer', background: selectedIds.length > 0 && selectedIds.length === processed.length ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {selectedIds.length > 0 && selectedIds.length === processed.length && <Check size={14} color="#000" />}
                                </div>
                            </th>
                            <th className="sortable-th" onClick={() => toggleSort('date')}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Date<SortIcon key="date" /></div></th>
                            <th className="sortable-th" onClick={() => toggleSort('tour_name')}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Tour Name<SortIcon key="tour_name" /></div></th>
                            <th className="sortable-th" onClick={() => toggleSort('venue')}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Venue<SortIcon key="venue" /></div></th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Setlist</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processed.map(live => (
                            <tr key={live.id} style={{ background: selectedIds.includes(live.id) ? 'rgba(34, 197, 94, 0.1)' : 'transparent' }}>
                                <td style={{ padding: '0 10px', textAlign: 'center' }}>
                                    <div onClick={() => toggleSelection(live.id)} style={{ width: '18px', height: '18px', border: '1px solid #64748b', borderRadius: '4px', cursor: 'pointer', margin: '0 auto', background: selectedIds.includes(live.id) ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {selectedIds.includes(live.id) && <Check size={14} color="#000" />}
                                    </div>
                                </td>
                                <td style={{ width: '120px' }}>{new Date(live.date).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ fontWeight: 'bold' }}>
                                        {live.tour_name}
                                        {live.special_note && <span style={{ color: '#fbbf24', marginLeft: '8px' }}>({live.special_note})</span>}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{live.title}</div>
                                    {live.type && <span className="badge">{live.type}</span>}
                                </td>
                                <td>{live.venue}</td>
                                <td style={{ textAlign: 'center' }}>
                                    {(live as any).setlist?.length > 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <Check size={16} color="#34d399" />
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({(live as any).setlist.length})</span>
                                        </div>
                                    ) : live.setlist_status === 'UNKNOWN_SETLIST' ? (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', whiteSpace: 'nowrap' }}>未登録</span>
                                    ) : (
                                        <X size={16} color="#475569" />
                                    )}
                                </td>
                                <td style={{ width: '180px' }}>
                                    <div className="actions-wrapper">
                                        <button onClick={() => openEditLive(live)} className="action-btn" title="Edit Live" style={{ color: '#fbbf24' }}><Edit2 size={18} /></button>
                                        <button onClick={() => openSetlistEditor(live)} className="action-btn" title="Edit Setlist" style={{ color: '#3b82f6' }}><ListMusic size={18} /></button>
                                        <button onClick={() => {
                                            const d = new Date(live.date);
                                            const q = `UVERworld ${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                            window.open(`https://www.setlist.fm/search?query=${encodeURIComponent(q)}`, '_blank');
                                        }} className="action-btn" title="Search on Setlist.fm" style={{ color: '#8b5cf6' }}><Search size={18} /></button>
                                        <button onClick={() => handleManualPush(live)} className="action-btn" title="Send Push Notification" style={{ color: '#ec4899' }}><BellRing size={18} /></button>
                                        <button onClick={() => handleDeleteLive(live.id)} className="action-btn delete" title="Delete"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {lives.length === 0 && <tr><td colSpan={6} className="empty-cell">No lives registered yet.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Live Edit/Add Modal */}
            {showLiveModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editingLive ? 'Edit Live Event' : 'Add New Live'}</h2>
                        <form onSubmit={handleLiveSubmit}>
                            <div className="form-group"><label>Tour Name</label><input type="text" required value={liveFormData.tour_name} onChange={e => setLiveFormData({ ...liveFormData, tour_name: e.target.value })} /></div>
                            <div className="form-group"><label>Title (Optional)</label><input type="text" placeholder="Specific show name e.g. Final, Birthday" value={liveFormData.title} onChange={e => setLiveFormData({ ...liveFormData, title: e.target.value })} /></div>
                            <div className="form-group">
                                <label>Live Type</label>
                                <select value={liveFormData.type} onChange={e => setLiveFormData({ ...liveFormData, type: e.target.value })} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}>
                                    <option value="ONEMAN">Generic / One Man</option>
                                    <option value="ARENA">Arena / Dome</option>
                                    <option value="HALL">Hall</option>
                                    <option value="LIVEHOUSE">Live House</option>
                                    <option value="FESTIVAL">Festival</option>
                                    <option value="EVENT">Event / Tai-ban</option>
                                </select>
                            </div>
                            <div className="form-group"><label>Date</label><input type="date" required value={liveFormData.date} onChange={e => setLiveFormData({ ...liveFormData, date: e.target.value })} /></div>
                            <div className="form-group">
                                <label>Venue</label>
                                <input type="text" required value={liveFormData.venue} onChange={e => {
                                    const venue = e.target.value;
                                    const v = venue.toLowerCase();
                                    let type = liveFormData.type;
                                    if (v.includes('arena') || v.includes('dome') || v.includes('アリーナ') || v.includes('ドーム')) type = 'ARENA';
                                    else if (v.includes('zepp') || v.includes('coast') || v.includes('ax') || v.includes('hatch') || v.includes('pit')) type = 'LIVEHOUSE';
                                    else if (v.includes('hall') || v.includes('kaikan') || v.includes('会館') || v.includes('ホール')) type = 'HALL';
                                    setLiveFormData({ ...liveFormData, venue, type });
                                }} list="venue-suggestions-admin" />
                                <datalist id="venue-suggestions-admin">
                                    {[...new Set(lives.map(l => l.venue))].sort().map(venue => <option key={venue} value={venue} />)}
                                </datalist>
                            </div>
                            <div className="form-group">
                                <label>Special Note (Optional)</label>
                                <input type="text" placeholder="例: TAKUYA∞ 生誕祭、男祭り、Xmas" value={liveFormData.special_note || ''} onChange={e => setLiveFormData({ ...liveFormData, special_note: e.target.value })} />
                                <small style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>特別イベント情報（生誕祭、男祭り、女祭り、Xmas等）</small>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowLiveModal(false)} className="btn-cancel">Cancel</button>
                                <button type="submit" className="btn-primary">Save Live</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">一括削除の確認</h2>
                            <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>{selectedIds.length}件のライブを削除します。この操作は取り消せません。</p>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>キャンセル</button>
                                <button type="button" className="btn-primary" style={{ background: '#ef4444', color: 'white', border: 'none' }} onClick={executeDeleteSelected}>削除する</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Setlist Editor */}
            {showSetlistEditor && selectedLiveForSetlist && (
                <SetlistEditor
                    liveId={selectedLiveForSetlist.id}
                    liveDate={new Date(selectedLiveForSetlist.date).toLocaleDateString()}
                    liveTitle={selectedLiveForSetlist.tour_name + (selectedLiveForSetlist.title ? ` - ${selectedLiveForSetlist.title}` : '')}
                    onClose={() => setShowSetlistEditor(false)}
                    onEditLive={() => { setShowSetlistEditor(false); openEditLive(selectedLiveForSetlist); }}
                />
            )}
        </div>
    );
};

export default AdminLivesTab;
