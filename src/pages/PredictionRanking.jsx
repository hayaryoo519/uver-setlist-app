import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Heart, Plus, Calendar, User, Sparkles, Eye, PenTool } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/Layout/PageHeader';
import SEO from '../components/SEO';

const PredictionRanking = () => {
    const [predictions, setPredictions] = useState([]);
    const [predictableLives, setPredictableLives] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const liveId = searchParams.get('live_id');
    const [liveInfo, setLiveInfo] = useState(null);
    const [tourLives, setTourLives] = useState([]);


    const [sortBy, setSortBy] = useState('popular');

    useEffect(() => {
        if (liveId) {
            fetchPredictions();
            fetchLiveInfo();
        } else {
            fetchPredictableLives();
        }
    }, [liveId, sortBy]); // sortByが変更されたら再取得

    const fetchPredictableLives = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/predictions/lives');
            if (res.ok) {
                const data = await res.json();
                setPredictableLives(data);
            }
        } catch (error) {
            console.error('Failed to fetch predictable lives', error);
        } finally {
            setIsLoading(false);
        }
    };

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
            const url = `/api/predictions?live_id=${liveId}&sort=${sortBy}`;
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
                // Update local state
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

    // 自分の投稿をトップに持ってくるためのソート済み配列
    const sortedPredictions = [...predictions].sort((a, b) => {
        if (a.is_mine && !b.is_mine) return -1;
        if (!a.is_mine && b.is_mine) return 1;
        return 0; // それ以外はAPIの順序（いいね順 or 新着順）を維持
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
                <p>読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
            <SEO 
                title={liveId ? `${liveInfo?.venue}のセトリ予想ランキング` : "セトリ予想ポータル"} 
                description="みんなが作成したUVERworldのセットリスト予想ランキング。これからのライブを予想して盛り上がろう！" 
            />

            <div className="max-w-4xl mx-auto px-4">
                <PageHeader
                    title="セトリ予想"
                    subtitle={liveId ? "みんなのセトリ予想" : "予想ポータル"}
                />

                {!liveId ? (
                    /* --- PORTAL VIEW --- */
                    <div className="mt-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="text-yellow-400" size={20} />
                                予想受付中のライブ
                            </h2>
                            <Link to="/lives" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                                アーカイブを見る
                            </Link>
                        </div>

                        {predictableLives.length === 0 ? (
                            <div className="text-center py-20 bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl">
                                <Calendar size={48} className="mx-auto text-slate-700 mb-4" />
                                <p className="text-slate-500">現在、予想受付中のライブはありません</p>
                                <p className="text-slate-600 text-sm mt-1">次のツアー発表を待とう！</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {predictableLives.map((live, idx) => (
                                    <div 
                                        key={live.id}
                                        className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 group"
                                        style={{ animationDelay: `${idx * 0.1}s` }}
                                    >
                                        <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-blue-600/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-blue-500/20">
                                                        開催予定
                                                    </span>
                                                    <span className="text-slate-500 text-xs font-bold">
                                                        {new Date(live.date).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', weekday: 'short' }).replace(/\//g, '.')}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                                    {live.tour_name || 'Special Live'}
                                                </h3>
                                                <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">
                                                    {live.venue}
                                                </p>
                                                
                                                <div className="mt-4 flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                                                        <PenTool size={12} className="text-blue-400" />
                                                        {live.prediction_count}件の予想
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <Link
                                                    to={`/predictions/new?live_id=${live.id}`}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-900/40"
                                                >
                                                    <Plus size={18} />
                                                    予想する
                                                </Link>
                                                <Link
                                                    to={`/predictions?live_id=${live.id}`}
                                                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <Eye size={18} />
                                                    みんなの予想
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* --- RANKING VIEW (Current Implementation) --- */
                    <>
                        {/* ライブ情報・セレクター */}
                        <div className="mt-4 mb-6">
                            <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                                {liveInfo ? (
                                    <div className="p-5 md:p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-yellow-500/20 p-3 rounded-xl border border-yellow-500/30">
                                                    <Calendar className="text-yellow-400" size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-white leading-tight">
                                                        {liveInfo.tour_name || 'Special Live'}
                                                    </h3>
                                                    <p className="text-slate-400 text-sm mt-1">
                                                        {liveInfo.date ? new Date(liveInfo.live_date || liveInfo.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : ''}
                                                        <span className="mx-2">/</span>
                                                        {liveInfo.venue}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => navigate('/predictions')}
                                                    className="text-xs bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-3 py-2 rounded-lg border border-blue-500/30 transition-colors font-bold"
                                                >
                                                    ポータルに戻る
                                                </button>
                                                <Link to="/lives" className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-colors">
                                                    他のライブを探す
                                                </Link>
                                            </div>
                                        </div>

                                        {tourLives.length > 1 && (
                                            <div className="mt-5 pt-5 border-t border-slate-700/50 flex flex-col sm:flex-row sm:items-center gap-3">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    対象公演を変更:
                                                </label>
                                                <select
                                                    value={liveId || ''}
                                                    onChange={(e) => navigate(`/predictions?live_id=${e.target.value}`)}
                                                    className="bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer flex-1 min-w-0 appearance-none"
                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                                                >
                                                    {tourLives.map(l => (
                                                        <option key={l.id} value={l.id}>
                                                            {new Date(l.date).toLocaleDateString('ja-JP')} @ {l.venue}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-slate-400">ライブ情報が見つかりません</p>
                                        <button onClick={() => navigate('/predictions')} className="mt-4 inline-block text-blue-400 hover:underline">
                                            ポータルから選ぶ
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 投稿ボタン & ソートタブ */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700 w-fit">
                                <button
                                    onClick={() => setSortBy('popular')}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${sortBy === 'popular' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    人気順
                                </button>
                                <button
                                    onClick={() => setSortBy('new')}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${sortBy === 'new' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    新着順
                                </button>
                            </div>

                            <Link
                                to={`/predictions/new?live_id=${liveId}`}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Plus size={20} />
                                予想を投稿する
                            </Link>
                        </div>

                        {/* 予想リスト */}
                        <div className="space-y-4">
                            {sortedPredictions.length === 0 ? (
                                <div className="text-center py-20 bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl">
                                    <Sparkles size={48} className="mx-auto text-slate-700 mb-4" />
                                    <p className="text-slate-500">まだ予想が投稿されていません</p>
                                    <p className="text-slate-600 text-sm mt-1">最初の予想を投稿して盛り上げよう！</p>
                                </div>
                            ) : (
                                sortedPredictions.map((prediction, index) => (
                                    <Link 
                                        to={`/predictions/${prediction.id}`} 
                                        key={prediction.id} 
                                        className={`block group relative ${prediction.is_mine ? 'ring-2 ring-blue-500/50 rounded-2xl' : ''}`}
                                    >
                                        {prediction.is_mine && (
                                            <div className="absolute -top-3 left-6 bg-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full z-10 shadow-lg border border-blue-400">
                                                自分の予想
                                            </div>
                                        )}
                                        
                                        <div className={`bg-slate-800/50 hover:bg-slate-800 border border-slate-700 group-hover:border-blue-500/50 rounded-2xl p-5 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20 flex items-center`}>
                                            <div className="w-10 text-center mr-4">
                                                {sortBy === 'popular' ? (
                                                    <span className={`text-2xl font-black ${index === 0 && !prediction.is_mine ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                        {index + 1}
                                                    </span>
                                                ) : (
                                                    <div className="bg-slate-700/50 p-2 rounded-lg">
                                                        <Eye size={18} className="text-slate-500" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                                        {prediction.username}さんの予想
                                                    </h2>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                            <User size={12} className="text-blue-400" />
                                                        </div>
                                                        {prediction.username}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={12} />
                                                        {new Date(prediction.created_at).toLocaleDateString('ja-JP')}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center gap-1 border-l border-slate-700/50 pl-6">
                                                <button
                                                    onClick={(e) => handleLike(e, prediction.id)}
                                                    className={`group/like flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${prediction.is_liked ? 'text-pink-500' : 'text-slate-500 hover:bg-pink-500/10 hover:text-pink-400'}`}
                                                >
                                                    <Heart 
                                                        size={24} 
                                                        fill={prediction.is_liked ? "currentColor" : "none"} 
                                                        className={`transition-transform duration-300 ${prediction.is_liked ? 'scale-110' : 'group-hover/like:scale-110'}`} 
                                                    />
                                                    <span className="text-xs font-black tracking-tighter">{prediction.like_count}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PredictionRanking;
