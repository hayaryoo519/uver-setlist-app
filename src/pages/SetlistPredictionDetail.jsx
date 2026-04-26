import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, User, Calendar, MapPin, Music, ArrowLeft, Share2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/Layout/PageHeader';
import SEO from '../components/SEO';

const SetlistPredictionDetail = () => {
    const { id } = useParams();
    const [prediction, setPrediction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchPredictionDetail();
    }, [id]);

    const fetchPredictionDetail = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/predictions/${id}`, {
                headers: token ? { 'token': token } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setPrediction(data);
            } else {
                console.error('Failed to fetch prediction detail');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLike = async () => {
        if (!currentUser) {
            if (window.confirm("いいねするにはログインが必要です。\nログインページに移動しますか？")) {
                navigate('/login', { state: { from: `/predictions/${id}` } });
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
                setPrediction(prev => ({
                    ...prev,
                    is_liked: data.liked,
                    like_count: data.liked ? prev.like_count + 1 : prev.like_count - 1
                }));
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `${prediction.username}さんのセトリ予想`,
                text: `UVERworld ${prediction.tour_name} のセットリスト予想をチェック！`,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("URLをコピーしました！");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                    <p className="text-slate-400 font-mono text-sm">予想を読み込み中...</p>
                </div>
            </div>
        );
    }

    if (!prediction) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold mb-4">予想が見つかりません</h1>
                <Link to="/predictions" className="text-blue-400 hover:underline">セトリ予想一覧へ</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in" style={{ paddingTop: '100px', paddingBottom: '80px' }}>
            <SEO 
                title={`${prediction.username}さんのセトリ予想`} 
                description={`UVERworld ${prediction.tour_name || ''} のセットリスト予想。${prediction.songs?.length || 0}曲の構成をチェック。`}
            />

            <div className="max-w-3xl mx-auto px-4">
                <div className="mb-8 flex items-center justify-between">
                    <Link to="/predictions" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">セトリ予想一覧へ</span>
                    </Link>
                    <button onClick={handleShare} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <Share2 size={18} />
                    </button>
                </div>

                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-6 md:p-10 border border-slate-700 shadow-2xl relative overflow-hidden">
                    {/* Background Decorative Element */}
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Sparkles size={120} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                            <div>
                                <div className="flex items-center gap-2 text-blue-400 mb-2">
                                    <Sparkles size={16} />
                                    <span className="text-xs font-black tracking-widest uppercase">セトリ予想</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                                    {prediction.username} <span className="text-slate-500 font-normal">の予想</span>
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        {new Date(prediction.created_at).toLocaleDateString('ja-JP')}
                                    </div>
                                    <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                                    <div className="flex items-center gap-1.5">
                                        <Heart size={14} className={prediction.is_liked ? "text-pink-500" : ""} fill={prediction.is_liked ? "currentColor" : "none"} />
                                        {prediction.like_count} いいね
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLike}
                                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
                                    prediction.is_liked 
                                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' 
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                            >
                                <Heart size={18} fill={prediction.is_liked ? "currentColor" : "none"} />
                                {prediction.is_liked ? 'いいね済' : 'いいね！'}
                            </button>
                        </div>

                        {/* Live Info Banner */}
                        {prediction.tour_name && (
                            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 mb-10 flex items-start gap-4">
                                <div className="bg-blue-500/20 p-2.5 rounded-xl">
                                    <Music size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-blue-400 mb-1 uppercase tracking-wider">対象の公演</div>
                                    <div className="text-lg font-bold text-white mb-1">{prediction.tour_name}</div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <span className="flex items-center gap-1"><MapPin size={14} /> {prediction.venue}</span>
                                        <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(prediction.live_date).toLocaleDateString('ja-JP')}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h2 className="text-xs font-black tracking-[0.3em] text-slate-500 uppercase mb-4 pl-1">予想セットリスト</h2>
                            {prediction.songs?.map((song, index) => (
                                <div 
                                    key={index} 
                                    className="group flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-blue-500/30 transition-all hover:bg-slate-800/50"
                                >
                                    <div className="w-8 h-8 flex items-center justify-center font-mono text-sm font-bold text-slate-500 group-hover:text-blue-400 bg-slate-900 rounded-lg border border-slate-700 transition-colors">
                                        {(index + 1).toString().padStart(2, '0')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors">
                                            {song.title}
                                        </div>
                                    </div>
                                    <Link 
                                        to={`/song/${encodeURIComponent(song.title.replace(/\s+/g, ''))}`}
                                        className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
                                    >
                                        <Share2 size={16} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-12 space-y-6">
                    {/* Share Section */}
                    <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-700/50 text-center">
                        <p className="text-slate-400 text-sm mb-6 font-medium">この予想をあなたのSNSでシェアしませんか？</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button 
                                onClick={() => {
                                    const songsText = prediction.songs?.map((s, i) => `${i + 1}. ${s.title}`).join('\n') || '';
                                    const text = `セットリストを予想しました！\n${prediction.tour_name}\n${prediction.venue} / ${new Date(prediction.live_date).toLocaleDateString('ja-JP')}\n\n${songsText}\n\n当たると思う？👇\n`;
                                    const url = window.location.href;
                                    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=UVERworld,セトリ予想`;
                                    window.open(xUrl, '_blank');
                                }}
                                className="flex items-center gap-3 px-8 py-4 bg-[#1DA1F2] text-white font-black rounded-full hover:brightness-110 transition-all shadow-lg shadow-blue-500/20 w-full sm:w-auto"
                            >
                                <Share2 size={20} />
                                Xでシェア
                            </button>
                            
                            <button 
                                onClick={handleShare}
                                className="flex items-center gap-3 px-8 py-4 bg-slate-700 text-white font-black rounded-full hover:bg-slate-600 transition-all w-full sm:w-auto"
                            >
                                <Link size={20} />
                                リンクをコピー
                            </button>
                        </div>
                    </div>

                    {/* Guest CTA Section - Only show if not the owner and not logged in (or just not the owner to encourage more) */}
                    {!prediction.is_mine && (
                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl p-8 border border-blue-500/30 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Sparkles size={160} />
                            </div>
                            <div className="relative z-10 text-center md:text-left md:flex items-center justify-between gap-8">
                                <div className="mb-6 md:mb-0">
                                    <h3 className="text-2xl font-black text-white mb-2 italic">ARE YOU READY?</h3>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        あなたなら、どんなセットリストを組みますか？<br className="hidden md:block" />
                                        自分だけの最強の予想を投稿して、みんなと盛り上がりましょう！
                                    </p>
                                </div>
                                <Link 
                                    to={currentUser ? `/predictions/new?live_id=${prediction.live_id}` : "/login"}
                                    state={!currentUser ? { from: `/predictions/new?live_id=${prediction.live_id}` } : null}
                                    className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-black rounded-full hover:bg-blue-400 hover:text-white transition-all shadow-2xl whitespace-nowrap"
                                >
                                    {currentUser ? '自分の予想を作る' : 'ログインして予想する'}
                                    <ArrowLeft size={20} className="rotate-180" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SetlistPredictionDetail;
