import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Heart, Plus, Calendar, User, Sparkles, Eye, PenTool } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/Layout/PageHeader';
import SEO from '../components/SEO';

const PredictionRanking = () => {
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const liveId = searchParams.get('live_id');
    const [liveInfo, setLiveInfo] = useState(null);
    const [tourLives, setTourLives] = useState([]);

    useEffect(() => {
        fetchPredictions();
        if (liveId) {
            fetchLiveInfo();
        }
    }, [liveId]);

    const fetchLiveInfo = async () => {
        try {
            const res = await fetch(`/api/lives/${liveId}`);
            if (res.ok) {
                const data = await res.json();
                setLiveInfo(data);

                // 同じツアーのライブ一覧を取得
                if (data.tour_name) {
                    const tourRes = await fetch(`/api/lives?tour_name=${encodeURIComponent(data.tour_name)}`);
                    if (tourRes.ok) {
                        const tourData = await tourRes.json();
                        // 日付昇順にソート
                        tourData.sort((a, b) => new Date(a.date) - new Date(b.date));
                        setTourLives(tourData);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch live info', error);
        }
    };

    const fetchPredictions = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = liveId ? `/api/predictions?live_id=${liveId}` : '/api/predictions';
            const res = await fetch(url, {
                headers: token ? { 'token': token } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setPredictions(data);
            } else {
                console.error('Failed to fetch predictions');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLike = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser) {
            if (window.confirm("いいねするにはログインが必要です。\nログインページに移動しますか？")) {
                navigate('/login', { state: { from: location.pathname } });
            }
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/predictions/${id}/like`, {
                method: 'POST',
                headers: {
                    'token': token
                }
            });

            if (res.ok) {
                const data = await res.json();
                // Update local state to reflect like change
                setPredictions(prev => prev.map(p => {
                    if (p.id === id) {
                        return {
                            ...p,
                            is_liked: data.liked,
                            like_count: data.liked ? p.like_count + 1 : p.like_count - 1
                        };
                    }
                    return p;
                }));
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
                <p>読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
            <SEO title="セトリ予想ランキング" description="みんなが作成したUVERworldのセットリスト予想ランキング。" />

            <div className="max-w-4xl mx-auto px-4">
                <PageHeader
                    title="SETLIST GUESS"
                    subtitle="みんなのセトリ予想"
                />

                {/* ライブ情報 */}
                {liveInfo && (
                    <div className="mt-4 mb-6 bg-slate-800/50 border border-yellow-500/30 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4 flex-col md:flex-row md:items-center">
                            <div className="flex items-start gap-3 flex-1">
                                <span className="text-yellow-400 text-lg shrink-0 mt-0.5">🎤</span>
                                <div>
                                    <div className="text-white font-bold leading-tight mb-1" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                        {liveInfo.tour_name || 'Special Live'}
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {liveInfo.date ? new Date(liveInfo.date).toISOString().split('T')[0] : ''} @ {liveInfo.venue}
                                    </div>
                                </div>
                            </div>
                            <Link to="/predictions" className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-2 rounded-full text-center whitespace-nowrap shrink-0">
                                すべての予想を見る
                            </Link>
                        </div>

                        {/* ツアー日程選択ドロップダウン */}
                        {tourLives.length > 1 && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 mt-1">
                                <label className="text-xs font-medium text-slate-400 whitespace-nowrap">
                                    対象公演を変更:
                                </label>
                                <select
                                    value={liveId || ''}
                                    onChange={(e) => {
                                        const newId = e.target.value;
                                        navigate(`/predictions?live_id=${newId}`);
                                    }}
                                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer flex-1 min-w-0"
                                >
                                    {tourLives.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.date ? new Date(l.date).toISOString().split('T')[0] : ''} @ {l.venue}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* CTAセクション */}
                <div className="mt-6 mb-8">
                    <Link
                        to={liveId ? `/predictions/new?live_id=${liveId}` : "/predictions/new"}
                        className="group bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 hover:border-blue-400/60 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/30 block"
                        style={{ textDecoration: 'none' }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-500/20 p-2 rounded-lg">
                                <PenTool size={22} className="text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                                {liveInfo ? `${liveInfo.tour_name || 'このライブ'}の予想を作成する` : "予想を作成する"}
                            </h3>
                        </div>
                        <p className="text-sm text-slate-400">
                            あなたのセトリ予想を投稿してシェアしよう
                        </p>
                    </Link>
                </div>

                {/* ランキングセクション */}
                <div id="ranking">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-l-4 border-yellow-500 pl-3">
                        <Sparkles size={18} className="text-yellow-400" />
                        予想ランキング
                    </h2>
                </div>

                <div className="space-y-4 mt-8">
                    {predictions.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                            まだセトリ予想が投稿されていません。最初の予想を作成してみませんか？
                        </div>
                    ) : (
                        predictions.map((prediction, index) => (
                            <Link to={`/predictions/${prediction.id}`} key={prediction.id} className="block group">
                                <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl px-4 py-4 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/20 relative overflow-hidden flex items-center">
                                    {/* Ranking Number */}
                                    <div className="w-12 text-center">
                                        <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                                            {index + 1}
                                        </span>
                                    </div>

                                    {/* Main Info */}
                                    <div className="flex-1 min-w-0 px-4 border-l border-slate-700/50 ml-2 pl-4">
                                        <h2 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                            {prediction.username}さんの予想
                                        </h2>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <User size={14} /> {prediction.username}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} /> {new Date(prediction.created_at).toLocaleDateString('ja-JP')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Likes */}
                                    <div className="ml-auto text-center flex flex-col items-center justify-center gap-1 border-l border-slate-700/50 pl-4">
                                        <button
                                            onClick={(e) => handleLike(e, prediction.id)}
                                            className={`transition-all p-2 bg-slate-800 rounded-full ${prediction.is_liked ? 'text-pink-500 scale-110' : 'text-slate-500 hover:scale-110'}`}
                                        >
                                            <Heart size={20} fill={prediction.is_liked ? "currentColor" : "none"} />
                                        </button>
                                        <span className="font-bold text-slate-300">{prediction.like_count}</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PredictionRanking;
