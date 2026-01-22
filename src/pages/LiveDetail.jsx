import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAttendance } from '../hooks/useAttendance';
import { useAuth } from '../contexts/AuthContext';
import CorrectionModal from '../components/CorrectionModal';
import { AlertTriangle } from 'lucide-react';
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
            // Include return URL so they come back after login (would need Login page support for this, but for now just redirect)
            navigate('/login');
            return;
        }
        setIsCorrectionModalOpen(true);
    };

    useEffect(() => {
        // Fetch Live Data
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
            alert("更新に失敗しました。ログイン状態を確認してください。");
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

            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ marginBottom: '10px' }}>{mainTitle}</h1>
                {live.special_note && (
                    <div style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '500' }}>
                        {live.special_note}
                    </div>
                )}
                <div style={{ color: '#94a3b8', marginBottom: '16px' }}>
                    {new Date(live.date).toLocaleDateString()} @ {live.venue}
                </div>

                <button
                    onClick={handleToggleAttendance}
                    disabled={attendanceLoading}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: attendanceLoading ? 'wait' : 'pointer',
                        backgroundColor: isAttended(liveId) ? 'var(--accent-color)' : '#334155',
                        color: isAttended(liveId) ? '#0f172a' : 'white',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        opacity: attendanceLoading ? 0.7 : 1
                    }}
                >
                    {isAttended(liveId) ? '✓ 参戦済み' : '+ 参戦記録をつける'}
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
                                                // Remove spaces for clean URL (e.g. "CORE PRIDE" -> "COREPRIDE")
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
