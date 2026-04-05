import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Loader, Sparkles, ArrowRight, FileText, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import BulkImportModal from './BulkImportModal';

/**
 * セトリドラフト管理コンポーネント
 * - ドラフト一覧表示
 * - 新規ドラフト作成（テキストコピペ）
 * - GPT整形実行
 * - BulkImportModalへの連携
 */
const DraftManager = ({ lives, allSongs, onSetlistImported }) => {
    // ドラフト一覧
    const [drafts, setDrafts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('pending');

    // 新規作成フォーム
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newRawText, setNewRawText] = useState('');
    const [newSource, setNewSource] = useState('manual');
    const [newLiveId, setNewLiveId] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // GPT整形中のドラフトID
    const [parsingDraftId, setParsingDraftId] = useState(null);

    // BulkImportModal連携
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [bulkImportText, setBulkImportText] = useState('');
    const [activeDraftForImport, setActiveDraftForImport] = useState(null);
    
    // 画像アップロード用
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    // トースト通知
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // 編集・更新状態
    const [editingDraftId, setEditingDraftId] = useState(null);
    const [editText, setEditText] = useState('');
    const [isUpdatingOfficial, setIsUpdatingOfficial] = useState(null);

    // ドラフト一覧取得
    const fetchDrafts = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = statusFilter !== 'all'
                ? `/api/drafts?status=${statusFilter}`
                : '/api/drafts';
            const res = await fetch(url, { headers: { token } });
            if (res.ok) {
                const data = await res.json();
                setDrafts(data);
            }
        } catch (err) {
            console.error('ドラフト取得エラー:', err);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts]);

    // ドラフト新規作成
    const handleCreate = async () => {
        if (!newRawText.trim()) return;

        setIsCreating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify({
                    rawText: newRawText,
                    source: newSource,
                    liveId: newLiveId ? parseInt(newLiveId) : null
                })
            });

            if (res.ok) {
                showToast('ドラフトを作成しました');
                setNewRawText('');
                setNewLiveId('');
                setShowCreateForm(false);
                fetchDrafts();
            } else {
                const data = await res.json();
                showToast(data.message || '作成に失敗しました', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('通信エラーが発生しました', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    // GPT整形実行
    const handleParse = async (draftId) => {
        setParsingDraftId(draftId);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/drafts/${draftId}/parse`, {
                method: 'POST',
                headers: { token }
            });

            if (res.ok) {
                const data = await res.json();
                showToast(`GPT整形完了（${data.usage?.total_tokens || '?'}トークン使用）`);
                fetchDrafts();
            } else {
                const data = await res.json();
                showToast(data.message || 'GPT整形に失敗しました', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('GPT整形中にエラーが発生しました', 'error');
        } finally {
            setParsingDraftId(null);
        }
    };

    /**
     * 公式フラグの切り替え
     */
    const handleToggleOfficial = async (id, currentVal) => {
        try {
            setIsUpdatingOfficial(id);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/drafts/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    token
                },
                body: JSON.stringify({ officialSetlist: !currentVal })
            });

            if (response.ok) {
                const updated = await response.json();
                setDrafts(prev => prev.map(d => d.id === id ? updated : d));
                showToast(`公式フラグを${!currentVal ? 'オン' : 'オフ'}にしました`, 'success');
            } else {
                const data = await response.json();
                showToast(data.message || 'フラグ更新に失敗しました', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('フラグ更新に失敗しました', 'error');
        } finally {
            setIsUpdatingOfficial(null);
        }
    };

    // BulkImportModalに流し込み
    const handleImportToBulk = (draft) => {
        if (!draft.parsed_json || draft.parsed_json.length === 0) {
            showToast('先にGPT整形を実行してください', 'error');
            return;
        }

        // parsed_jsonからテキスト形式に変換してBulkImportModalに渡す
        const text = draft.parsed_json
            .map(item => `${item.position}. ${item.title}`)
            .join('\n');

        setBulkImportText(text);
        setActiveDraftForImport(draft);
        setShowBulkImport(true);
    };

    // BulkImportの結果処理 (Commit API呼び出し)
    const handleBulkImportComplete = async (liveId, setlistData) => {
        if (!activeDraftForImport) return;

        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/drafts/${activeDraftForImport.id}/commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify({ liveId, setlist: setlistData })
            });

            if (res.ok) {
                showToast('セットリストを確定しました');
                setShowBulkImport(false);
                setActiveDraftForImport(null);
                setBulkImportText('');
                fetchDrafts();
                
                // 親コンポーネントに通知 (一覧のリロード等)
                if (onSetlistImported) {
                    onSetlistImported(liveId);
                }
            } else {
                const data = await res.json();
                showToast(data.message || '確定に失敗しました', 'error');
            }
        } catch (err) {
            console.error('Commit エラー:', err);
            showToast('通信エラーが発生しました', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // ドラフト削除
    const handleDelete = async (draftId) => {
        if (!window.confirm('このドラフトを削除しますか？')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/drafts/${draftId}`, {
                method: 'DELETE',
                headers: { token }
            });

            if (res.ok) {
                showToast('ドラフトを削除しました');
                fetchDrafts();
            } else {
                const data = await res.json();
                showToast(data.message || '削除に失敗しました', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('削除に失敗しました', 'error');
        }
    };

    // テキスト編集保存
    const handleSaveText = async (draftId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/drafts/${draftId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify({ rawText: editText })
            });

            if (res.ok) {
                showToast('テキストを更新しました');
                setEditingDraftId(null);
                fetchDrafts();
            } else {
                showToast('更新に失敗しました', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('通信エラーが発生しました', 'error');
        }
    };
    
    // 画像アップロード & OCR開始
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // サイズチェック
        if (file.size > 5 * 1024 * 1024) {
            showToast('画像サイズは5MB以下にしてください', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        setIsUploading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/drafts/upload', {
                method: 'POST',
                headers: { token },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                showToast('画像をアップロードし、OCR処理を完了しました');
                fetchDrafts();
            } else if (res.status === 409) {
                const data = await res.json();
                showToast('同一のセトリが既に登録されています（Draft #' + (data.draft?.id || '?') + '）', 'error');
                fetchDrafts(); // 既存のものを表示するためにリロード
            } else {
                const data = await res.json();
                showToast(data.message || 'アップロードまたはOCRに失敗しました', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('通信エラーが発生しました', 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ステータスバッジの色
    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: '#f59e0b20', color: '#f59e0b', icon: <Clock size={12} />, label: 'Pending' },
            approved: { bg: '#10b98120', color: '#10b981', icon: <CheckCircle size={12} />, label: 'Approved' },
            rejected: { bg: '#ef444420', color: '#ef4444', icon: <XCircle size={12} />, label: 'Rejected' }
        };
        const s = styles[status] || styles.pending;
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '2px 8px', borderRadius: '12px',
                fontSize: '11px', fontWeight: '600',
                background: s.bg, color: s.color
            }}>
                {s.icon} {s.label}
            </span>
        );
    };

    // ソース表示
    const getSourceLabel = (source) => {
        const styles = {
            manual: { label: '手動入力', icon: <FileText size={10} />, bg: '#334155' },
            x: { label: 'X (Twitter)', icon: <Sparkles size={10} />, bg: '#1da1f2' },
            scrape: { label: 'Scrape', icon: <RefreshCw size={10} />, bg: '#0ea5e9' },
            ocr: { label: 'OCR', icon: <ImageIcon size={10} />, bg: '#8b5cf6' }
        };
        const s = styles[source] || { label: source, icon: null, bg: '#0f172a' };
        return (
            <span style={{
                fontSize: '10px', color: '#fff',
                background: s.bg, padding: '2px 8px',
                borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
                {s.icon} {s.label}
            </span>
        );
    };

    return (
        <div className="tab-content fade-in">
            {/* ヘッダー */}
            <div className="table-header-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} />
                    セトリドラフト管理
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: '6px 12px', borderRadius: '6px',
                            border: '1px solid #334155', background: '#1e293b',
                            color: '#fff', fontSize: '13px', cursor: 'pointer'
                        }}
                    >
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <button
                        onClick={() => fetchDrafts()}
                        style={{
                            padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid #334155', background: '#1e293b',
                            color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center'
                        }}
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={16} /> 新規ドラフト
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: '#334155', color: '#fff', border: 'none',
                            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '14px', fontWeight: 'bold'
                        }}
                    >
                        {isUploading ? <Loader className="spin" size={16} /> : <ImageIcon size={16} />}
                        画像から作成
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                </div>
            </div>

            {/* 新規作成フォーム */}
            {showCreateForm && (
                <div style={{
                    margin: '20px 0', padding: '20px',
                    background: '#1e293b', borderRadius: '12px',
                    border: '1px solid #334155'
                }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#e2e8f0', fontSize: '15px' }}>
                        新しいセトリドラフトを作成
                    </h4>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>ソース</label>
                            <select
                                value={newSource}
                                onChange={(e) => setNewSource(e.target.value)}
                                style={{
                                    width: '100%', padding: '8px', borderRadius: '6px',
                                    border: '1px solid #334155', background: '#0f172a',
                                    color: '#fff', fontSize: '13px'
                                }}
                            >
                                <option value="manual">手動入力</option>
                                <option value="x">X (Twitter)</option>
                                <option value="scrape">Scrape</option>
                                <option value="ocr">OCR</option>
                            </select>
                        </div>
                        <div style={{ flex: '2', minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>ライブ紐付け（任意）</label>
                            <select
                                value={newLiveId}
                                onChange={(e) => setNewLiveId(e.target.value)}
                                style={{
                                    width: '100%', padding: '8px', borderRadius: '6px',
                                    border: '1px solid #334155', background: '#0f172a',
                                    color: '#fff', fontSize: '13px'
                                }}
                            >
                                <option value="">-- 紐付けなし --</option>
                                {lives
                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                    .slice(0, 50)
                                    .map(live => (
                                        <option key={live.id} value={live.id}>
                                            {new Date(live.date).toLocaleDateString('ja-JP')} - {live.tour_name} @ {live.venue}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>セトリテキスト</label>
                        <textarea
                            value={newRawText}
                            onChange={(e) => setNewRawText(e.target.value)}
                            rows={12}
                            placeholder={`1. CORE PRIDE\n2. IMPACT\n3. 7th Trigger\n4. 儚くも永久のカナシ\n...\n\nコピペでOK！番号付きでも自動で除去されます。`}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid #334155', background: '#0f172a',
                                color: '#fff', fontSize: '13px', fontFamily: 'monospace',
                                resize: 'vertical', lineHeight: '1.6',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => { setShowCreateForm(false); setNewRawText(''); }}
                            style={{
                                padding: '8px 16px', borderRadius: '6px',
                                border: '1px solid #334155', background: 'transparent',
                                color: '#94a3b8', cursor: 'pointer', fontSize: '13px'
                            }}
                        >
                            キャンセル
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleCreate}
                            disabled={!newRawText.trim() || isCreating}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: !newRawText.trim() ? 0.5 : 1 }}
                        >
                            {isCreating ? <Loader className="spin" size={14} /> : <Plus size={14} />}
                            保存
                        </button>
                    </div>
                </div>
            )}

            {/* ドラフト一覧 */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <Loader className="spin" size={24} />
                    <p>読み込み中...</p>
                </div>
            ) : drafts.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px', color: '#475569',
                    border: '2px dashed #1e293b', borderRadius: '12px', margin: '20px 0'
                }}>
                    <FileText size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p style={{ fontSize: '15px', margin: 0 }}>
                        {statusFilter === 'pending' ? 'Pendingのドラフトはありません' : 'ドラフトがありません'}
                    </p>
                    <p style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>
                        「新規ドラフト」ボタンからセトリテキストを登録してください
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '20px 0' }}>
                    {drafts.map(draft => (
                        <div key={draft.id} style={{
                            background: '#1e293b', borderRadius: '12px',
                            border: (draft.confidence || 0) < 0.5 
                                ? '1px solid #ef4444' 
                                : (draft.confidence || 0) >= 0.8
                                    ? '1px solid #10b981'
                                    : '1px solid #334155', 
                            overflow: 'hidden',
                            transition: 'border-color 0.2s',
                            boxShadow: (draft.confidence || 0) >= 0.8 ? '0 0 15px #10b98120' : 'none'
                        }}>
                            {/* カードヘッダー */}
                            <div style={{
                                padding: '14px 16px', display: 'flex',
                                justifyContent: 'space-between', alignItems: 'center',
                                borderBottom: '1px solid #334155', background: '#0f172a40',
                                flexWrap: 'wrap', gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>#{draft.id}</span>
                                    {getStatusBadge(draft.status)}
                                    {getSourceLabel(draft.source)}
                                    {draft.source_url && (
                                        <a href={draft.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'none' }}>
                                            🔗 リンクを表示
                                        </a>
                                    )}
                                    {draft.duplicate_count > 1 && (
                                        <span style={{ 
                                            fontSize: '10px', background: '#3b82f620', color: '#60a5fa', 
                                            padding: '2px 6px', borderRadius: '4px', border: '1px solid #3b82f640'
                                        }}>
                                            👥 {draft.duplicate_count} 投稿を統合
                                        </span>
                                    )}
                                    {draft.official_setlist && (
                                        <span style={{ 
                                            fontSize: '10px', background: '#f59e0b20', color: '#fbbf24', 
                                            padding: '2px 6px', borderRadius: '4px', border: '1px solid #f59e0b40',
                                            fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px'
                                        }}>
                                            <Sparkles size={10} /> OFFICIAL
                                        </span>
                                    )}
                                    {draft.live_tour_name && (
                                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                                            📍 {draft.live_tour_name} ({draft.live_venue})
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {draft.confidence !== undefined && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ 
                                                fontSize: '10px', 
                                                fontWeight: 'bold',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                textTransform: 'uppercase',
                                                background: (draft.confidence || 0) >= 0.8 ? '#10b98120' : (draft.confidence || 0) < 0.5 ? '#ef444420' : 'transparent',
                                                color: (draft.confidence || 0) >= 0.8 ? '#10b981' : (draft.confidence || 0) < 0.5 ? '#ef4444' : '#64748b',
                                                border: (draft.confidence || 0) >= 0.8 || (draft.confidence || 0) < 0.5 ? '1px solid currentColor' : 'none'
                                            }}>
                                                {(draft.confidence || 0) >= 0.8 ? 'High Accuracy' : (draft.confidence || 0) < 0.5 ? 'Low Accuracy' : 'Normal'}
                                            </span>
                                            <div style={{
                                                width: '60px', height: '6px', background: '#334155',
                                                borderRadius: '3px', position: 'relative', overflow: 'hidden',
                                                boxShadow: (draft.confidence || 0) >= 0.8 ? '0 0 8px #10b98140' : 'none'
                                            }}>
                                                <div style={{
                                                    position: 'absolute', left: 0, top: 0, height: '100%',
                                                    width: `${(draft.confidence || 0) * 100}%`,
                                                    background: (draft.confidence || 0) >= 0.8 ? '#10b981' : (draft.confidence || 0) >= 0.5 ? '#f59e0b' : '#ef4444'
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: (draft.confidence || 0) >= 0.8 ? '#10b981' : (draft.confidence || 0) >= 0.5 ? '#f59e0b' : '#ef4444' }}>
                                                {Math.round((draft.confidence || 0) * 100)}%
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleToggleOfficial(draft.id, draft.official_setlist)}
                                        disabled={isUpdatingOfficial === draft.id}
                                        style={{
                                            background: draft.official_setlist ? '#fbbf2420' : 'transparent',
                                            border: '1px solid currentColor',
                                            color: draft.official_setlist ? '#fbbf24' : '#475569',
                                            padding: '3px 8px', borderRadius: '4px', cursor: 'pointer',
                                            fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'
                                        }}
                                    >
                                        {isUpdatingOfficial === draft.id ? <Loader className="spin" size={10} /> : <Sparkles size={10} />}
                                        {draft.official_setlist ? '公式解除' : '公式に設定'}
                                    </button>
                                    <span style={{ fontSize: '11px', color: '#475569' }}>
                                        {new Date(draft.created_at).toLocaleString('ja-JP')}
                                    </span>
                                </div>
                            </div>

                            {/* 低信頼度時の警告 */}
                            {(draft.confidence || 0) < 0.5 && (
                                <div style={{ 
                                    background: '#ef444415', padding: '8px 16px', 
                                    borderBottom: '1px solid #ef444430', color: '#f87171',
                                    fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    <AlertCircle size={14} />
                                    精度が低い可能性があります。内容を確認して、必要に応じて「編集」してください。
                                    {draft.source === 'ocr' && <span style={{ opacity: 0.8 }}>（画像が不鮮明・手書きの可能性があります）</span>}
                                </div>
                            )}

                            {/* カード本体 */}
                            <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {/* 画像プレビュー */}
                                {draft.raw_image_url && (
                                    <div style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155', flexShrink: 0 }}>
                                        <a href={draft.raw_image_url} target="_blank" rel="noopener noreferrer">
                                            <img 
                                                src={draft.raw_image_url} 
                                                alt="OCR Source" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            />
                                        </a>
                                    </div>
                                )}
                                
                                {/* 生テキスト */}
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>📝 RAW TEXT</div>
                                        {editingDraftId !== draft.id ? (
                                            <button 
                                                onClick={() => { setEditingDraftId(draft.id); setEditText(draft.raw_text); }}
                                                style={{ fontSize: '10px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                編集
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleSaveText(draft.id)}
                                                    style={{ fontSize: '10px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    保存
                                                </button>
                                                <button 
                                                    onClick={() => setEditingDraftId(null)}
                                                    style={{ fontSize: '10px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                                                >
                                                    戻る
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {editingDraftId === draft.id ? (
                                        <textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            rows={6}
                                            style={{
                                                width: '100%', padding: '8px', borderRadius: '6px',
                                                border: '1px solid #3b82f6', background: '#0f172a',
                                                color: '#fff', fontSize: '12px', fontFamily: 'monospace',
                                                resize: 'vertical'
                                            }}
                                        />
                                    ) : (
                                        <pre style={{
                                            background: '#0f172a', padding: '10px', borderRadius: '6px',
                                            fontSize: '12px', color: '#cbd5e1', maxHeight: '200px',
                                            overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.5',
                                            margin: 0, border: '1px solid #1e293b'
                                        }}>
                                            {draft.raw_text}
                                        </pre>
                                    )}
                                </div>

                                {/* 整形結果 */}
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: '600' }}>✨ PARSED RESULT</div>
                                    {draft.parsed_json && draft.parsed_json.length > 0 ? (
                                        <div style={{
                                            background: '#0f172a', padding: '10px', borderRadius: '6px',
                                            maxHeight: '200px', overflowY: 'auto',
                                            border: '1px solid #1e293b'
                                        }}>
                                            {draft.parsed_json.map((item, i) => (
                                                <div key={i} style={{
                                                    display: 'flex', gap: '8px', padding: '3px 0',
                                                    fontSize: '12px', borderBottom: i < draft.parsed_json.length - 1 ? '1px solid #1e293b' : 'none'
                                                }}>
                                                    <span style={{ color: '#475569', fontFamily: 'monospace', minWidth: '24px', textAlign: 'right' }}>
                                                        {item.position}.
                                                    </span>
                                                    <span style={{ color: '#e2e8f0' }}>{item.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            background: '#0f172a', padding: '20px', borderRadius: '6px',
                                            textAlign: 'center', color: '#334155', fontSize: '13px',
                                            border: '1px dashed #1e293b'
                                        }}>
                                            未整形 — 「GPT整形」を実行してください
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* アクションボタン */}
                            <div style={{
                                padding: '12px 16px', display: 'flex', gap: '8px',
                                justifyContent: 'flex-end', borderTop: '1px solid #334155',
                                background: '#0f172a40', flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={() => handleParse(draft.id)}
                                    disabled={parsingDraftId === draft.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '7px 14px', borderRadius: '6px',
                                        border: '1px solid #8b5cf6', background: '#8b5cf620',
                                        color: '#a78bfa', cursor: 'pointer', fontSize: '12px',
                                        fontWeight: '600', opacity: parsingDraftId === draft.id ? 0.5 : 1
                                    }}
                                >
                                    {parsingDraftId === draft.id
                                        ? <><Loader className="spin" size={14} /> 整形中...</>
                                        : <><Sparkles size={14} /> GPT整形</>
                                    }
                                </button>
                                <button
                                    onClick={() => handleImportToBulk(draft)}
                                    disabled={!draft.parsed_json || draft.parsed_json.length === 0}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '7px 14px', borderRadius: '6px',
                                        border: '1px solid #3b82f6', background: (draft.confidence || 0) > 0.8 ? '#3b82f640' : '#3b82f620',
                                        color: '#60a5fa', cursor: 'pointer', fontSize: '12px',
                                        fontWeight: '700',
                                        opacity: (!draft.parsed_json || draft.parsed_json.length === 0) ? 0.3 : 1,
                                        boxShadow: (draft.confidence || 0) > 0.8 ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none'
                                    }}
                                >
                                    <ArrowRight size={14} /> 取り込み
                                </button>
                                <button
                                    onClick={() => handleDelete(draft.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '7px 14px', borderRadius: '6px',
                                        border: '1px solid #334155', background: 'transparent',
                                        color: '#64748b', cursor: 'pointer', fontSize: '12px'
                                    }}
                                >
                                    <Trash2 size={14} /> 削除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* BulkImportModal */}
            {showBulkImport && (
                <BulkImportModal
                    onClose={() => { setShowBulkImport(false); setActiveDraftForImport(null); }}
                    onImport={handleBulkImportComplete}
                    allSongs={allSongs}
                    lives={lives}
                    initialText={bulkImportText}
                    initialLiveId={activeDraftForImport?.live_id}
                />
            )}

            {/* トースト通知 */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    padding: '12px 24px', borderRadius: '8px', zIndex: 60,
                    fontSize: '14px', fontWeight: '500', color: '#fff',
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    animation: 'toastSlideUp 0.3s ease-out'
                }}>
                    {toast.message}
                </div>
            )}

            <style>{`
                @keyframes toastSlideUp {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default DraftManager;
