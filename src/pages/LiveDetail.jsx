import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAttendance } from '../hooks/useAttendance';
import { useAuth } from '../contexts/AuthContext';
import CorrectionModal from '../components/CorrectionModal';
import { AlertTriangle, Tag, MapPin, Check, Plus, Star } from 'lucide-react';
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
    const location = useLocation();

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

    // Determine back link destination
    const backLink = location.state?.from || '/lives';
    let backLabel = 'アーカイブに戻る';
    if (backLink === '/dashboard') backLabel = 'ダッシュボードに戻る';
    else if (backLink === '/mypage') backLabel = 'My Pageに戻る';
    else if (backLink.startsWith('/song/')) backLabel = '楽曲詳細に戻る';

    const handleBack = (e) => {
        e.preventDefault();
        // 戻るボタンがブラウザバック（POP）として機能するように navigate(-1) を使用する。
        // これにより、ScrollToTop の除外ロジックと useScrollRestoration スクリプトが正しく動作する。
        if (location.state?.from) {
            navigate(-1);
        } else {
            navigate('/lives');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in pb-20" style={{ paddingTop: '100px' }}>
            <div className="prototype-banner">DESIGN PROTOTYPE MODE (IMAGE-LESS STITCH AESTHETICS)</div>
            <SEO
                title={`${mainTitle} (${new Date(live.date).toLocaleDateString()})`}
                description={`UVERworld ${mainTitle} @ ${live.venue} Setlist and Live Report.`}
            />
            
            <div className="max-w-3xl mx-auto px-6">
                <div className="flex justify-between items-center mb-10">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-slate-500 hover:text-white transition-all group"
                    >
                        <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center group-hover:border-slate-600 transition-colors">
                            &larr;
                        </div>
                        <span className="text-sm font-medium">{backLabel}</span>
                    </button>
                    
                    <button
                        onClick={handleToggleAttendance}
                        disabled={attendanceLoading}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2
                            ${isAttended(liveId)
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'}`}
                    >
                        {isAttended(liveId) ? <Check size={14} /> : <Plus size={14} />}
                        {isAttended(liveId) ? 'ATTENDED' : 'LOG ATTENDANCE'}
                    </button>
                </div>

                {/* Header Section */}
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase px-2 py-0.5 border border-blue-500/30 rounded">
                            {live.type || 'LIVE ARCHIVE'}
                        </span>
                        <div className="h-px flex-1 bg-slate-800"></div>
                        <span className="text-xs font-mono text-slate-500">
                            {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '.')}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-6 font-oswald text-white uppercase tracking-tight leading-tight">
                        {mainTitle}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-slate-400">
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin size={16} className="text-blue-500" />
                            <span className="text-white font-semibold">{live.venue}</span>
                        </div>
                        {((live.title && live.title !== mainTitle) || live.special_note) && (
                            <div className="flex items-center gap-4">
                                {live.title && live.title !== mainTitle && (
                                    <div className="text-blue-200/80 text-sm font-medium flex items-center gap-2 bg-blue-500/5 px-3 py-1 rounded-lg border border-blue-500/10">
                                        <Tag size={14} /> {live.title}
                                    </div>
                                )}
                                {live.special_note && (
                                    <div className="text-amber-400/90 text-sm font-bold flex items-center gap-2 bg-amber-400/5 px-3 py-1 rounded-lg border border-amber-400/10">
                                        <Star size={14} fill="currentColor" />
                                        {live.special_note}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                <div className="setlist bg-slate-800/20 rounded-3xl p-4 md:p-8 border border-slate-800/50">
                    <div className="mb-8 flex items-center justify-between">
                        <h2 className="text-xs font-black tracking-[0.3em] text-slate-500 uppercase">SETLIST PERFORMANCE</h2>
                        <div className="text-[10px] font-mono text-slate-600">{setlist.length} TRACKS</div>
                    </div>

                    {setlist.length > 0 ? (
                        <div className="space-y-1">
                            {setlist.map((song, index) => {
                                const isEncore = song.note === 'Encore';
                                const showEncoreHeader = isEncore && (index === 0 || setlist[index - 1].note !== 'Encore');

                                return (
                                    <React.Fragment key={index}>
                                        {showEncoreHeader && (
                                            <div className="flex items-center justify-center my-8">
                                                <div className="h-px flex-1 bg-slate-800"></div>
                                                <span className="px-6 text-[10px] font-black tracking-[0.5em] text-slate-400">ENCORE</span>
                                                <div className="h-px flex-1 bg-slate-800"></div>
                                            </div>
                                        )}
                                        <div className="group flex items-center py-4 px-4 rounded-xl hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-slate-800">
                                            <span className="w-10 text-slate-600 font-mono text-sm group-hover:text-blue-500 transition-colors">
                                                {String(song.position || index + 1).padStart(2, '0')}
                                            </span>
                                            <div className="flex-1">
                                                <Link
                                                    to={`/song/${encodeURIComponent(song.title.replace(/\s+/g, ''))}`}
                                                    state={{ from: location.pathname }}
                                                    className="inline-block text-lg font-medium text-slate-200 hover:text-white transition-colors tracking-wide"
                                                >
                                                    {song.title}
                                                </Link>
                                            </div>
                                            {song.note && song.note !== 'Encore' && (
                                                <span className="text-[10px] font-bold text-blue-400/80 bg-blue-400/5 px-2.5 py-1 rounded tracking-wider uppercase border border-blue-400/10">
                                                    {song.note}
                                                </span>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-600 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                            <p className="font-medium">SETLIST DATA NOT FOUND</p>
                        </div>
                    )}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                        If you found any errors in the setlist or live information, please let us know.
                    </p>
                    <button
                        className={`inline-flex items-center gap-3 px-8 py-4 rounded-full text-sm font-black tracking-widest transition-all duration-300
                            ${!currentUser 
                                ? 'bg-slate-800 text-slate-500 border border-slate-700' 
                                : 'bg-white text-black hover:bg-blue-500 hover:text-white shadow-xl shadow-white/5'}`}
                        onClick={handleCorrectionClick}
                    >
                        <AlertTriangle size={16} />
                        {currentUser ? 'REPORT CORRECTION' : 'LOGIN TO REPORT'}
                    </button>
                </div>
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
