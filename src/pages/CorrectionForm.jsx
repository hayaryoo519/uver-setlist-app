import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { AlertTriangle, Send, CheckCircle, ArrowLeft, Info } from 'lucide-react';
import './CorrectionForm.css';

const CORRECTION_TYPES = [
    { value: 'setlist', label: 'セットリスト（曲順・曲名・曲の過不足）' },
    { value: 'venue', label: '会場名' },
    { value: 'date', label: '日付' },
    { value: 'title', label: 'ライブタイトル/ツアー名' },
    { value: 'missing_live', label: '未登録ライブの追加依頼' },
    { value: 'other', label: 'その他' }
];

const MIN_DESCRIPTION_LENGTH = 20;

function CorrectionForm() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Form State
    const [liveDate, setLiveDate] = useState('');
    const [liveVenue, setLiveVenue] = useState('');
    const [liveTitle, setLiveTitle] = useState('');
    const [correctionType, setCorrectionType] = useState('');
    const [description, setDescription] = useState('');

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        // We need to wait for auth check to complete, but useAuth doesn't expose loading state directly here easily 
        // without wrapping. Assuming AuthContext handles initial load.
        // For simplicity, checking currentUser directly. If it's null on mount, we might redirect too early if it's still loading.
        // Ideally useAuth provides loading state. 
        // Let's implement a check securely.

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    if (!currentUser) return null; // Prevent flash

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

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
                    live_date: liveDate || null,
                    live_venue: liveVenue || null,
                    live_title: liveTitle || null,
                    correction_type: correctionType,
                    description: description
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '送信に失敗しました');
            }

            setSuccess(true);

            // Clear form
            setLiveDate('');
            setLiveVenue('');
            setLiveTitle('');
            setCorrectionType('');
            setDescription('');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="container" style={{ paddingTop: '100px' }}>
                <SEO title="送信完了 - データ修正依頼" />
                <div className="correction-form-container">
                    <div className="correction-form-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <CheckCircle size={64} color="#10b981" style={{ marginBottom: '20px' }} />
                        <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>送信完了</h2>
                        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '30px' }}>
                            修正依頼を受け付けました。<br />
                            管理者が内容を確認し、データの反映を行います。
                        </p>
                        <button
                            onClick={() => setSuccess(false)}
                            className="submit-btn"
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--primary-color)',
                                color: 'var(--primary-color)',
                                display: 'inline-block',
                                padding: '10px 30px'
                            }}
                        >
                            別の修正を送る
                        </button>
                        <div style={{ marginTop: '20px' }}>
                            <Link to="/lives" style={{ color: '#94a3b8' }}>ライブ一覧に戻る</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '100px' }}>
            <SEO title="データ修正依頼" description="UVERworld Setlist Archiveのライブデータ修正・追加依頼フォーム" />

            <div className="correction-form-container">
                <Link to="/lives" className="back-link">
                    <ArrowLeft size={16} /> ライブ一覧に戻る
                </Link>

                <div className="correction-form-header">
                    <h2><AlertTriangle size={32} /> データ修正依頼</h2>
                    <p>
                        データの誤りや不足している情報（未登録のライブ、セットリストの間違いなど）をご報告ください。<br />
                        皆様のご協力により、アーカイブの精度が向上します。
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="correction-form-card">
                    <div className="form-section">
                        <h3><Info size={18} /> 対象ライブ情報 (任意)</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '15px' }}>
                            ライブ詳細ページから依頼する場合は不要です。未登録ライブの追加や、特定できない情報の修正時に入力してください。
                        </p>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>日付</label>
                                <input
                                    type="date"
                                    value={liveDate}
                                    onChange={(e) => setLiveDate(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>会場名</label>
                                <input
                                    type="text"
                                    placeholder="例: 日本武道館"
                                    value={liveVenue}
                                    onChange={(e) => setLiveVenue(e.target.value)}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>ライブタイトル / ツアー名</label>
                                <input
                                    type="text"
                                    placeholder="例: UVERworld LIVE TOUR 2024"
                                    value={liveTitle}
                                    onChange={(e) => setLiveTitle(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>依頼内容</h3>
                        <div className="form-group">
                            <label>修正の種類 *</label>
                            <select
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
                            <label>
                                詳細説明 * <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({description.length}/{MIN_DESCRIPTION_LENGTH}文字以上)</span>
                            </label>
                            <textarea
                                placeholder="修正内容を詳しく記述してください。出典（公式サイトのURLなど）があれば併記していただけると助かります。"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="correction-error">
                            <AlertTriangle size={16} style={{ float: 'left', marginRight: '8px', marginTop: '2px' }} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="correction-submit-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '送信中...' : (
                            <>
                                <Send size={18} /> 依頼を送信する
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CorrectionForm;
