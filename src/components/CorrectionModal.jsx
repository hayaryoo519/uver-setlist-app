import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Send, X, CheckCircle, List, Play, RefreshCw, AlertCircle } from 'lucide-react';
import './CorrectionModal.css';

const CORRECTION_TYPES = [
    { value: 'setlist', label: 'セットリスト（曲順・曲名・曲の過不足）' },
    { value: 'venue', label: '会場名' },
    { value: 'date', label: '日付' },
    { value: 'title', label: 'ライブタイトル/ツアー名' },
    { value: 'other', label: 'その他' }
];

const MIN_DESCRIPTION_LENGTH = 20;

function CorrectionModal({ isOpen, onClose, liveId, liveDate, liveVenue, liveTitle }) {
    const { currentUser } = useAuth();
    const [correctionType, setCorrectionType] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Setlist Structured Data State
    const [rawSetlist, setRawSetlist] = useState('');
    const [parsedSetlist, setParsedSetlist] = useState(null);
    const [allSongs, setAllSongs] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    React.useEffect(() => {
        if (correctionType === 'setlist' && allSongs.length === 0) {
            const fetchSongs = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/songs', { headers: { token } });
                    if (res.ok) {
                        const data = await res.json();
                        setAllSongs(data);
                    }
                } catch (err) { console.error('Failed to load songs'); }
            };
            fetchSongs();
        }
    }, [correctionType]);

    // Auto-analyze effect
    React.useEffect(() => {
        if (correctionType !== 'setlist') return;

        const timer = setTimeout(() => {
            if (!rawSetlist.trim()) {
                setParsedSetlist(null);
                return;
            }

            setIsAnalyzing(true);

            // Logic mimic
            const lines = rawSetlist.split('\n').filter(line => line.trim() !== '');
            const results = lines.map((line, index) => {
                let cleanLine = line.replace(/^([0-9]+[\.\s]*|M[0-9]+[\.\s]*)/i, '').trim();
                // Allow SE/MC as per recent update

                // Find match
                let match = allSongs.find(s => s.title.toLowerCase() === cleanLine.toLowerCase());
                if (!match) {
                    match = allSongs.find(s => cleanLine.toLowerCase().includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(cleanLine.toLowerCase()));
                }

                return {
                    original: line,
                    clean: cleanLine,
                    songId: match ? match.id : null,
                    songTitle: match ? match.title : cleanLine + ' (Unknown)',
                    isUnknown: !match
                };
            }).filter(Boolean);

            setParsedSetlist(results);
            setIsAnalyzing(false);

            // Optional: Don't overwrite description automatically to avoid annoying user
            // if (!description) setDescription('セットリスト情報の更新依頼');

        }, 800);

        return () => clearTimeout(timer);
    }, [rawSetlist, correctionType, allSongs]);

    /* Removed manual handleAnalyzeSetlist */

    const handleResetAnalysis = () => {
        setParsedSetlist(null);
        setRawSetlist('');
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!correctionType) {
            setError('修正対象を選択してください');
            return;
        }

        if (description.length < MIN_DESCRIPTION_LENGTH) {
            setError(`詳細説明は${MIN_DESCRIPTION_LENGTH}文字以上で入力してください`);
            return;
        }

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/corrections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({
                    live_id: liveId,
                    correction_type: correctionType,
                    description: description,
                    suggested_data: correctionType === 'setlist' && parsedSetlist ? { setlist: parsedSetlist } : null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '送信に失敗しました');
            }

            setSuccess(true);
            // Auto close after 2 seconds
            setTimeout(() => {
                handleClose();
            }, 2000);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setCorrectionType('');
        setDescription('');
        setError('');
        setSuccess(false);
        onClose();
    };

    const formattedDate = liveDate ? new Date(liveDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '';

    return (
        <div className="correction-modal-overlay" onClick={handleClose}>
            <div className={`correction-modal ${correctionType === 'setlist' ? 'setlist-modal' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: correctionType === 'setlist' ? '800px' : '500px', transition: 'max-width 0.3s' }}>
                <div className="correction-modal-header">
                    <h2><AlertTriangle size={20} /> 修正依頼を送る</h2>
                    <button className="close-btn" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {success ? (
                    <div className="correction-success">
                        <CheckCircle size={48} color="#10b981" />
                        <h3>送信完了！</h3>
                        <p>ご協力ありがとうございます。内容を確認後、必要に応じて修正いたします。</p>
                    </div>
                ) : (
                    <>
                        <div className="correction-live-info">
                            <div className="info-label">対象ライブ</div>
                            <div className="info-title">{liveTitle}</div>
                            <div className="info-meta">{formattedDate} @ {liveVenue}</div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="correction-type">修正対象 *</label>
                                <select
                                    id="correction-type"
                                    value={correctionType}
                                    onChange={(e) => setCorrectionType(e.target.value)}
                                    required
                                >
                                    <option value="">選択してください</option>
                                    {CORRECTION_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">
                                    詳細説明 * <span className="char-count">({description.length}/{MIN_DESCRIPTION_LENGTH}文字以上)</span>
                                </label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="例: 3曲目と4曲目の順番が逆です。実際は「CORE PRIDE」の後に「THE OVER」が演奏されました。"
                                    rows={5}
                                    required
                                />
                            </div>

                            {correctionType === 'setlist' && (
                                <div className="form-group" style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#60a5fa' }}>
                                        <List size={18} /> セットリスト一括解析 (Paste Setlist)
                                        {isAnalyzing && <span className="spin" style={{ marginLeft: 'auto' }}><RefreshCw size={14} /> 解析中...</span>}
                                    </label>

                                    {!parsedSetlist ? (
                                        <>
                                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>
                                                お手持ちのセットリストテキストを貼り付けてください。自動的に曲を解析します。
                                            </p>
                                            <textarea
                                                value={rawSetlist}
                                                onChange={(e) => setRawSetlist(e.target.value)}
                                                placeholder={`1. CHANCE!\n2. SHAMROCK\n...`}
                                                rows={8}
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff', padding: '10px', fontFamily: 'monospace' }}
                                            />
                                        </>
                                    ) : (
                                        <div className="parsed-results">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>解析結果 ({parsedSetlist.length}曲)</span>
                                                <button type="button" onClick={handleResetAnalysis} style={{ fontSize: '0.8rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>やり直す</button>
                                            </div>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #475569', borderRadius: '4px', background: '#0f172a' }}>
                                                {parsedSetlist.map((item, idx) => (
                                                    <div key={idx} style={{ padding: '6px 10px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                                                        <span style={{ color: '#64748b', width: '20px' }}>{idx + 1}.</span>
                                                        {item.isUnknown ? (
                                                            <div style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <AlertCircle size={14} /> {item.clean} (不明)
                                                            </div>
                                                        ) : (
                                                            <div style={{ color: '#86efac', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <CheckCircle size={14} /> {item.songTitle}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {parsedSetlist.some(i => i.isUnknown) && (
                                                <p style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '5px' }}>※ 一部の曲が見つかりませんでした。詳細説明で正しい曲名を補足してください。</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {error && (
                                <div className="correction-error">
                                    {error}
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={handleClose}>
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? '送信中...' : (
                                        <>
                                            <Send size={16} /> 送信
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="correction-note">
                            <p>※ 修正依頼は管理者が確認後、適用されます。</p>
                            <p>※ 同一ライブへの依頼は24時間に1回までです。</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default CorrectionModal;
