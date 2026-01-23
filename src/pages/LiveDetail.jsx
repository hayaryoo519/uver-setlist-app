import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAttendance } from '../hooks/useAttendance';
import { useAuth } from '../contexts/AuthContext';
import CorrectionModal from '../components/CorrectionModal';
import { AlertTriangle, Tag, MapPin, Check, Plus } from 'lucide-react';
import SEO from '../components/SEO';

function LiveDetail() {
    const { id } = useParams();
    const liveId = parseInt(id, 10);
    const [live, setLive] = useState(null);
    const [loading, setLoading] = useState(true);
    const { isAttended, addLive, removeLive, loading: attendanceLoading } = useAttendance();
    const { currentUser } = useAuth();
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const navigate = useNavigate();

    const handleCorrectionClick = () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setIsCorrectionModalOpen(true);
    };

    useEffect(() => {
        const fetchLive = async () => {
            try {
                const res = await fetch(`/api/lives/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setLive(data);
                } else {
                    setLive(null);
                }
            } catch (e) {
                console.error("Failed to fetch live detail", e);
            } finally {
                setLoading(false);
            }
        };
        fetchLive();
    }, [id]);

    const handleToggleAttendance = async () => {
        let success;
        if (isAttended(liveId)) {
            success = await removeLive(liveId);
        } else {
            success = await addLive(liveId);
        }

        if (!success) {
            const shouldLogin = window.confirm("参戦記録をつけるにはログインが必要です。\nログインページに移動しますか？");
            if (shouldLogin) {
                navigate('/login');
            }
        }
    };

    if (loading) {
        return <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>Loading...</div>;
    }

    if (!live) {
        return <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>ライブが見つかりません</div>;
    }

    const setlist = live.setlist || [];
    const mainTitle = live.tour_name || live.title || "Unknown Live";

    return (
        <div className="container" style={{ paddingTop: '100px' }}>
            <SEO
                title={`${mainTitle} (${new Date(live.date).toLocaleDateString()})`}
                description={`UVERworld ${mainTitle} @ ${live.venue} Setlist and Live Report.`}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <Link to="/lives" style={{ color: '#94a3b8' }}>&larr; アーカイブに戻る</Link>
                <Link to="/mypage" style={{ color: 'var(--accent-color)' }}>マイページ &rarr;</Link>
            </div>

            {/* Header Section */}
            <div style={{ marginBottom: '30px' }}>
                <h1 className="text-3xl font-bold mb-3 font-oswald text-white">{mainTitle}</h1>
                {live.special_note && (
                    <div className="text-amber-400 text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        {live.special_note}
                    </div>
                )}
                <div className="flex items-center gap-2 text-slate-400 mb-6 text-lg">
                    <span>{new Date(live.date).toLocaleDateString()}</span>
                    <MapPin size={18} className="text-red-500" strokeWidth={2.5} />
                    <span className="text-white font-medium">{live.venue}</span>
                </div>

                <button
                    onClick={handleToggleAttendance}
                    disabled={attendanceLoading}
                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-2
                        ${isAttended(liveId)
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-900/20'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                    {isAttended(liveId) ? <Check size={18} /> : <Plus size={18} />}
                    {isAttended(liveId) ? '参戦済み' : '参戦記録をつける'}
                </button>
            </div>

            <div className="setlist">
                {setlist.length > 0 ? (
                    setlist.map((song, index) => {
                        const isEncore = song.note === 'Encore';
                        const showEncoreHeader = isEncore && (index === 0 || setlist[index - 1].note !== 'Encore');

                        return (
                            <React.Fragment key={index}>
                                {showEncoreHeader && (
                                    <div style={{
                                        textAlign: 'center',
                                        color: '#94a3b8',
                                        fontSize: '0.8rem',
                                        letterSpacing: '2px',
                                        margin: '20px 0 10px',
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <span style={{ padding: '0 10px', backgroundColor: 'var(--bg-color)', position: 'relative', zIndex: 1 }}>ENCORE</span>
                                        <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: '#334155' }}></div>
                                    </div>
                                )}
                                <div style={{
                                    padding: '16px 10px',
                                    borderBottom: '1px solid #1e293b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'background-color 0.2s',
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <span style={{
                                        width: '40px',
                                        color: '#64748b',
                                        fontWeight: 'bold',
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem'
                                    }}>
                                        {String(song.position || index + 1).padStart(2, '0')}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                                            <Link
                                                to={`/song/${encodeURIComponent(song.title.replace(/\s+/g, ''))}`}
                                                className="hover:text-blue-400 hover:underline transition-colors text-white"
                                            >
                                                {song.title}
                                            </Link>
                                        </div>
                                    </div>
                                    {song.note && song.note !== 'Encore' && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                            color: 'var(--accent-color)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            marginLeft: '10px'
                                        }}>
                                            {song.note}
                                        </span>
                                    )}
                                </div>
                            </React.Fragment>
                        );
                    })
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <p>この公演のセットリストはありません。</p>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid #334155', paddingTop: '30px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>
                    セットリストや公演情報に誤りを見つけた場合は、お知らせください。
                </p>
                <button
                    className={`report-correction-btn ${!currentUser ? 'login-required' : ''}`}
                    onClick={handleCorrectionClick}
                >
                    <AlertTriangle size={16} />
                    {currentUser ? '情報の誤りを報告する' : 'ログインして情報の誤りを報告'}
                </button>
            </div>

            <CorrectionModal
                isOpen={isCorrectionModalOpen}
                onClose={() => setIsCorrectionModalOpen(false)}
                liveId={liveId}
                liveDate={live.date}
                liveVenue={live.venue}
                liveTitle={mainTitle}
            />
        </div>
    );
}

export default LiveDetail;
