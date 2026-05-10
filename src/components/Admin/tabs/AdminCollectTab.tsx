import React, { useState, useEffect } from 'react';
import { Loader, Search, Download, Check, ListMusic, ExternalLink, Edit2, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useLives } from '../../../hooks/queries/useLives';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { apiClient } from '../../../lib/apiClient';
import type { Live } from '../../../types/api';

const MEMBER_BIRTHDAYS: Record<string, string> = {
    '12-21': 'TAKUYA∞', '11-05': '真太郎', '02-22': '克哉',
    '03-08': '彰', '02-14': '信人', '09-25': '誠果',
};

const detectVenueType = (vName: string): string => {
    if (vName.includes('arena') || vName.includes('dome') || vName.includes('アリーナ') || vName.includes('ドーム')) return 'ARENA';
    if (vName.includes('zepp') || vName.includes('coast') || vName.includes('hatch') || vName.includes('pit') || vName.includes('ax')) return 'LIVEHOUSE';
    if (vName.includes('hall') || vName.includes('kaikan') || vName.includes('会館') || vName.includes('ホール')) return 'HALL';
    return 'ONEMAN';
};

const AdminCollectTab = () => {
    const { data: lives = [] } = useLives({ include_setlists: true });
    const queryClient = useQueryClient();

    const [searchYear, setSearchYear] = useState(new Date().getFullYear());
    const [searchKeyword, setSearchKeyword] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [sfmResults, setSfmResults] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importResultData, setImportResultData] = useState<any>(null);
    const [previewData, setPreviewData] = useState<any>(null);

    const [bulkYearStart, setBulkYearStart] = useState(2000);
    const [bulkYearEnd, setBulkYearEnd] = useState(2014);
    const [isBulkCollecting, setIsBulkCollecting] = useState(false);
    const [bulkJob, setBulkJob] = useState<any>(null);

    const invalidateLives = () => queryClient.invalidateQueries({ queryKey: queryKeys.lives.all });

    // Recalculate duplicate status when lives update
    useEffect(() => {
        setSfmResults(prev => {
            if (prev.length === 0) return prev;
            const existingMap = buildExistingMap(lives);
            return prev.map(r => {
                const dateStr = r.eventDate.split('-').reverse().join('-');
                const key = `${dateStr}_${r.venue.name.toLowerCase()}`;
                const existingLive = existingMap.get(key);
                return { ...r, alreadyImported: !!existingLive, existingLive };
            });
        });
    }, [lives]);

    const buildExistingMap = (liveList: Live[]) => {
        const map = new Map<string, Live>();
        liveList.forEach(live => {
            const dateStr = new Date(live.date).toISOString().split('T')[0];
            map.set(`${dateStr}_${live.venue.toLowerCase()}`, live);
        });
        return map;
    };

    const processResult = (result: any) => {
        const parts = result.eventDate.split('-');
        const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        const vName = result.venue.name.toLowerCase();
        let suggestedType = detectVenueType(vName);
        let displayTourName = result.tour?.name;
        let specialNote: string | null = null;

        const month = parseInt(parts[1]);
        const day = parseInt(parts[0]);
        const year = parts[2];
        const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const memberName = MEMBER_BIRTHDAYS[monthDay];
        if (memberName) { specialNote = `${memberName} 生誕祭`; suggestedType = 'EVENT'; }

        if (!displayTourName || !displayTourName.trim()) {
            if (suggestedType === 'ONEMAN') suggestedType = 'EVENT';
            if (result.info) {
                displayTourName = result.info;
            } else {
                const fullText = `${result.info || ''} ${result.tour?.name || ''} ${result.venue.name}`;
                if (vName.includes('makuhari messe') && month === 12 && day >= 28) {
                    displayTourName = `COUNTDOWN JAPAN ${year.slice(-2)}/${(parseInt(year) + 1).toString().slice(-2)}`; suggestedType = 'FESTIVAL';
                } else if (fullText.includes('男祭り')) {
                    specialNote = '男祭り'; displayTourName = `UVERworld 男祭り ${year}`; suggestedType = 'EVENT';
                } else if (fullText.includes('女祭り')) {
                    specialNote = '女祭り'; displayTourName = `UVERworld 女祭り ${year}`; suggestedType = 'EVENT';
                } else if (fullText.toLowerCase().includes('xmas') || fullText.includes('クリスマス')) {
                    specialNote = 'Xmas'; displayTourName = `UVERworld PREMIUM LIVE on Xmas ${year}`; suggestedType = 'EVENT';
                } else {
                    displayTourName = result.tour?.name || `${result.venue.name} Event`;
                }
            }
        } else {
            const fullText = `${result.info || ''} ${result.venue.name}`;
            if (!specialNote) {
                if (fullText.includes('男祭り')) { specialNote = '男祭り'; suggestedType = 'EVENT'; }
                else if (fullText.includes('女祭り')) { specialNote = '女祭り'; suggestedType = 'EVENT'; }
                else if (fullText.toLowerCase().includes('xmas') || fullText.includes('クリスマス')) { specialNote = 'Xmas'; suggestedType = 'EVENT'; }
            }
        }

        const existingLive = buildExistingMap(lives).get(`${dateStr}_${result.venue.name.toLowerCase()}`);
        return { ...result, alreadyImported: !!existingLive, existingLive, tour: { ...result.tour, name: displayTourName }, suggestedType, specialNote };
    };

    const handleSearch = async (overrideKeyword?: string) => {
        const keyword = typeof overrideKeyword === 'string' ? overrideKeyword : searchKeyword;
        setIsSearching(true);
        setSfmResults([]);
        try {
            let allResults: any[] = [];
            let page = 1;
            let totalPages = 1;
            do {
                if (page > 1) await new Promise(r => setTimeout(r, 1500));
                try {
                    const data: any = await apiClient.get(`/api/external/setlistfm/search?year=${searchYear}&keyword=${encodeURIComponent(keyword)}&page=${page}`);
                    if (data.setlist) {
                        allResults = [...allResults, ...data.setlist];
                        totalPages = Math.ceil(data.total / (data.itemsPerPage || 20));
                        page++;
                    } else break;
                } catch (pageErr) {
                    if (page === 1 && (pageErr as any).status !== 404) alert((pageErr as any).data?.message || 'Error occurred during search');
                    break;
                }
            } while (page <= totalPages && page <= 10);
            setSfmResults(allResults.map(processResult));
        } catch { alert('Failed to search setlist.fm'); } finally { setIsSearching(false); }
    };

    const handleImportSingle = async (setlist: any) => {
        if (!window.confirm(`Import setlist for ${setlist.eventDate}?`)) return;
        setIsImporting(true);
        try {
            const liveData = { tour_name: setlist.tour?.name, title: '', date: setlist.eventDate.split('-').reverse().join('-'), venue: setlist.venue.name, type: setlist.suggestedType || 'ONEMAN', special_note: setlist.specialNote || null };
            const newLive: any = await apiClient.post('/api/lives', liveData);
            if (setlist.sets?.set) {
                const songIds: number[] = [];
                for (const song of setlist.sets.set.flatMap((s: any) => s.song)) {
                    try { const s: any = await apiClient.post('/api/songs', { title: song.name }); songIds.push(s.id); } catch {}
                }
                if (songIds.length > 0) await apiClient.put(`/api/lives/${newLive.id}/setlist`, { songs: songIds });
            }
            alert('Import successful!');
            invalidateLives();
        } catch (err) { alert('Error during import: ' + (err as any).message); } finally { setIsImporting(false); }
    };

    const handleBulkImport = async () => {
        setIsImporting(true);
        let successCount = 0, failCount = 0;
        try {
            let objects = sfmResults.filter(r => selectedIds.includes(r.id) && !r.alreadyImported);
            if (objects.length === 0) { setImportResultData({ success: 0, failed: 0, message: 'All selected items were already imported.' }); return; }
            for (const setlist of objects) {
                try {
                    const liveData = { tour_name: setlist.tour?.name, title: '', date: setlist.eventDate.split('-').reverse().join('-'), venue: setlist.venue.name, type: setlist.suggestedType || 'ONEMAN', special_note: setlist.specialNote || '' };
                    const newLive: any = await apiClient.post('/api/lives', liveData);
                    const songIds: number[] = [];
                    if (setlist.sets?.set) {
                        for (const song of setlist.sets.set.flatMap((s: any) => s.song)) {
                            try { const s: any = await apiClient.post('/api/songs', { title: song.name }); songIds.push(s.id); } catch {}
                        }
                        if (songIds.length > 0) await apiClient.put(`/api/lives/${newLive.id}/setlist`, { songs: songIds });
                    }
                    successCount++;
                } catch { failCount++; }
            }
            setImportResultData({ success: successCount, failed: failCount });
        } catch { alert('Error during bulk import'); } finally { setIsImporting(false); }
    };

    const closeImportResult = () => {
        setImportResultData(null);
        setSelectedIds([]);
        invalidateLives();
    };

    const handleBulkCollect = async () => {
        if (bulkYearStart > bulkYearEnd) { alert('開始年は終了年以下にしてください'); return; }
        setIsBulkCollecting(true);
        setBulkJob(null);
        try {
            const data: any = await apiClient.post('/api/external/setlistfm/collect-years', { yearStart: bulkYearStart, yearEnd: bulkYearEnd });
            const jobId = data.jobId;
            const interval = setInterval(async () => {
                try {
                    const job: any = await apiClient.get(`/api/external/setlistfm/collect-status/${jobId}`);
                    setBulkJob(job);
                    if (job.status === 'done' || job.status === 'error') {
                        clearInterval(interval);
                        setIsBulkCollecting(false);
                        invalidateLives();
                    }
                } catch { clearInterval(interval); setIsBulkCollecting(false); }
            }, 3000);
        } catch (err) {
            alert('一括収集の開始に失敗しました: ' + ((err as any).data?.message || (err as any).message));
            setIsBulkCollecting(false);
        }
    };

    const QUICK_TAGS = ['男祭り', '女祭り', '生誕祭', 'Xmas', 'PREMIUM LIVE', 'Festival', '武道館', '横浜アリーナ', '大阪城ホール', 'マリンメッセ'];
    const YEARS = Array.from({ length: 27 }, (_, i) => 2000 + i);

    return (
        <div className="tab-content fade-in">
            {/* 過去データ一括収集 */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={18} color="#94a3b8" /> 過去データ一括収集（Setlist.fm）
                </h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <select value={bulkYearStart} onChange={e => setBulkYearStart(Number(e.target.value))} disabled={isBulkCollecting} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#fff', width: '90px', cursor: 'pointer' }}>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span style={{ color: '#94a3b8' }}>年 〜</span>
                    <select value={bulkYearEnd} onChange={e => setBulkYearEnd(Number(e.target.value))} disabled={isBulkCollecting} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#fff', width: '90px', cursor: 'pointer' }}>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span style={{ color: '#94a3b8' }}>年</span>
                    <button className="btn-primary" onClick={handleBulkCollect} disabled={isBulkCollecting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isBulkCollecting ? <Loader className="spin" size={16} /> : <Download size={16} />} 一括収集開始
                    </button>
                </div>
                {bulkJob && (
                    <div style={{ background: '#0f172a', borderRadius: '6px', padding: '12px', fontSize: '0.875rem' }}>
                        {bulkJob.status === 'running' && <div style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}><Loader className="spin" size={14} /> 実行中: {bulkJob.currentYear}年 / {bulkJob.currentPage}ページ目</div>}
                        {bulkJob.status === 'done' && <div style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}><CheckCircle size={14} /> 完了</div>}
                        {bulkJob.status === 'error' && <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}><AlertTriangle size={14} /> エラー: {bulkJob.error}</div>}
                        <div style={{ display: 'flex', gap: '20px', color: '#94a3b8' }}>
                            <span>作成: <strong style={{ color: '#fff' }}>{bulkJob.totalCreated ?? 0}</strong></span>
                            <span>スキップ: <strong style={{ color: '#fff' }}>{bulkJob.totalSkipped ?? 0}</strong></span>
                            <span>失敗: <strong style={{ color: '#ef4444' }}>{bulkJob.totalFailed ?? 0}</strong></span>
                        </div>
                    </div>
                )}
            </div>

            <div className="table-header-panel"><h3>Collect from Setlist.fm</h3></div>
            <div className="collect-panel" style={{ padding: '20px' }}>
                <div className="collect-search-row" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <select value={searchYear} onChange={(e) => setSearchYear(Number(e.target.value))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: '#fff', width: '100px', cursor: 'pointer' }}>
                        {[...Array(new Date().getFullYear() - 2000 + 2)].map((_, i) => { const y = new Date().getFullYear() + 1 - i; return <option key={y} value={y}>{y}</option>; })}
                    </select>
                    <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="Optional: Keyword (Tour/Venue)" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: '#fff', flex: 1, minWidth: '120px' }} />
                    <button className="btn-primary" onClick={() => handleSearch()} disabled={isSearching}>
                        {isSearching ? <Loader className="spin" size={18} /> : <Search size={18} />} Search
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {QUICK_TAGS.map(tag => (
                        <button key={tag} onClick={() => { setSearchKeyword(tag); handleSearch(tag); }} style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '15px', border: '1px solid #475569', background: searchKeyword === tag ? 'var(--primary-color)' : '#334155', color: '#fff', cursor: 'pointer' }}>
                            #{tag}
                        </button>
                    ))}
                    {searchKeyword && <button onClick={() => setSearchKeyword('')} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>Clear</button>}
                </div>

                {sfmResults.length > 0 && (
                    <div style={{ marginBottom: '15px', color: '#94a3b8' }}>Found <strong>{sfmResults.length}</strong> setlists for {searchYear}</div>
                )}

                {sfmResults.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <button className="btn-secondary" onClick={() => setSelectedIds(selectedIds.length === sfmResults.length ? [] : sfmResults.map(r => r.id))} style={{ fontSize: '0.9rem', padding: '5px 10px' }}>
                            {selectedIds.length === sfmResults.length ? 'Deselect All' : 'Select All'}
                        </button>
                        {selectedIds.length > 0 && (
                            <button className="btn-primary" onClick={handleBulkImport} disabled={isImporting} style={{ fontSize: '0.9rem', padding: '5px 10px' }}>
                                {isImporting ? <Loader className="spin" size={16} /> : <Download size={16} />} Import Selected ({selectedIds.length})
                            </button>
                        )}
                    </div>
                )}

                <div style={{ display: 'grid', gap: '10px', maxHeight: '600px', overflowY: 'auto' }}>
                    {sfmResults.length === 0 && !isSearching && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', border: '1px dashed #334155', borderRadius: '8px' }}>
                            <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No setlists found for {searchYear}</p>
                            <p style={{ fontSize: '0.9rem' }}>Try checking the year or clearing the keyword.</p>
                        </div>
                    )}
                    {sfmResults.map(setlist => (
                        <div key={setlist.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: selectedIds.includes(setlist.id) ? '1px solid var(--primary-color)' : '1px solid #334155' }} onClick={() => setSelectedIds(prev => prev.includes(setlist.id) ? prev.filter(x => x !== setlist.id) : [...prev, setlist.id])}>
                            <div style={{ width: '20px', height: '20px', marginRight: '15px', borderRadius: '4px', border: '1px solid #64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedIds.includes(setlist.id) ? 'var(--primary-color)' : 'transparent', flexShrink: 0 }}>
                                {selectedIds.includes(setlist.id) && <Check size={14} color="#fff" />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold' }}>{setlist.eventDate} @ {setlist.venue.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {setlist.tour?.name || 'No Tour'}
                                    {setlist.specialNote && <span style={{ color: '#fbbf24', marginLeft: '8px' }}>({setlist.specialNote})</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {setlist.alreadyImported && <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}>⚠ Already Imported</span>}
                                    {(!setlist.sets?.set || setlist.sets.set.length === 0) && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>⚠ No Songs Listed</span>}
                                </div>
                            </div>
                            <div className="actions-wrapper">
                                <button onClick={(e) => { e.stopPropagation(); setPreviewData(setlist); }} className="action-btn" title="View Setlist" style={{ color: '#3b82f6' }}><ListMusic size={18} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleImportSingle(setlist); }} className="action-btn" title="Import This Setlist" style={{ color: '#22c55e' }} disabled={isImporting}><Download size={18} /></button>
                                <a href={setlist.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="action-btn" title="Open on Setlist.fm" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}><ExternalLink size={18} /></a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Setlist Preview Modal */}
            {previewData && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>Setlist Preview</h2>
                            <button onClick={() => setPreviewData(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px' }}>{previewData.eventDate} @ {previewData.venue.name}</div>
                            <div style={{ color: '#94a3b8' }}>{previewData.tour?.name || 'Unknown Tour'}</div>
                        </div>
                        {previewData.sets?.set?.length > 0 ? previewData.sets.set.map((set: any, si: number) => (
                            <div key={si} style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '0.9rem', color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: '5px', marginBottom: '10px' }}>
                                    {set.encore ? `Encore${set.encore > 1 ? ` ${set.encore}` : ''}` : `Set ${si + 1}`}
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {set.song.map((song: any, idx: number) => (
                                        <li key={idx} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px' }}>
                                            <span style={{ color: '#64748b', width: '25px', textAlign: 'right' }}>{idx + 1}.</span>
                                            <span>{song.name}</span>
                                            {song.info && <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '10px', fontStyle: 'italic' }}>({song.info})</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )) : <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No songs listed.</div>}
                        <div className="modal-actions">
                            <button type="button" onClick={() => setPreviewData(null)} className="btn-cancel">Close</button>
                            <button type="button" onClick={() => { handleImportSingle(previewData); setPreviewData(null); }} className="btn-primary" disabled={isImporting}>
                                {isImporting ? <Loader className="spin" size={18} /> : <Download size={18} />} Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Import Result Modal */}
            {importResultData && (
                <div className="modal-overlay" onClick={closeImportResult}>
                    <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <h2>Import Complete</h2>
                        {importResultData.message ? (
                            <p style={{ color: '#94a3b8' }}>{importResultData.message}</p>
                        ) : (
                            <>
                                <p style={{ color: '#4ade80', fontSize: '1.2rem' }}>{importResultData.success} setlists imported</p>
                                {importResultData.failed > 0 && <p style={{ color: '#ef4444' }}>{importResultData.failed} failed</p>}
                            </>
                        )}
                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <button className="btn-primary" onClick={closeImportResult}>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCollectTab;
