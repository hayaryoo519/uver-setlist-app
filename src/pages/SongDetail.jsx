import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { Music, Calendar, MapPin, Play, Clock, ArrowLeft, Loader, Sparkles, Disc, ChevronDown, ChevronsDown, ChevronUp } from 'lucide-react';
import SEO from '../components/SEO';
import { DISCOGRAPHY } from '../data/discography';

const SongDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [song, setSong] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterYear, setFilterYear] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [visibleCount, setVisibleCount] = useState(10);
    const [sortOrder, setSortOrder] = useState('newest');

    // Extract Unique Filter Options
    const uniqueYears = React.useMemo(() => {
        if (!song || !song.performances) return [];
        const years = new Set(song.performances.map(p => new Date(p.date).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [song]);

    const uniqueTypes = React.useMemo(() => {
        if (!song || !song.performances) return [];
        const types = new Set(song.performances.map(p => p.type || 'ONEMAN'));
        return Array.from(types).sort();
    }, [song]);

    // Filter and Sort Logic
    const filteredPerformances = React.useMemo(() => {
        if (!song || !song.performances) return [];

        let result = [...song.performances];

        // Filter by Year
        if (filterYear !== 'All') {
            result = result.filter(live => new Date(live.date).getFullYear().toString() === filterYear.toString());
        }

        // Filter by Type
        if (filterType !== 'All') {
            result = result.filter(live => (live.type || 'ONEMAN') === filterType);
        }

        // Sort
        result.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [song, filterYear, filterType, sortOrder]);

    useEffect(() => {
        const fetchSong = async () => {
            try {
                // Ensure spaces are removed to match Dashboard link format (CORE PRIDE -> COREPRIDE)
                const spacelessId = id.toString().replace(/\s+/g, '');
                const encodedId = encodeURIComponent(spacelessId);
                const res = await fetch(`/api/songs/${encodedId}/stats`);
                if (res.ok) {
                    const data = await res.json();
                    setSong(data);
                } else {
                    console.error("Failed to fetch song");
                    setError(`Failed to fetch song: ${res.status} ${res.statusText}`);
                }
            } catch (error) {
                console.error("Error:", error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSong();
        fetchSong();
    }, [id]);

    // Handle hash scroll
    useEffect(() => {
        if (!isLoading && song && location.hash === '#performance-history') {
            const element = document.getElementById('performance-history');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [isLoading, song, location]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900">
                <Loader className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex justify-center items-center text-red-400 p-8 flex-col text-center">
                <div className="text-2xl font-bold mb-4">Error Loading Song</div>
                <div className="bg-red-900/20 p-4 rounded border border-red-500/30">
                    {error}
                </div>
                <Link to="/songs" className="mt-8 text-blue-400 hover:text-blue-300 underline">
                    Return to Song List
                </Link>
            </div>
        );
    }

    if (!song) {
        return (
            <div className="min-h-screen bg-slate-900 flex justify-center items-center text-white">
                Song not found.
            </div>
        );
    }

    const playCount = song.performances.length;
    const lastPlayed = playCount > 0 ? new Date(song.performances[0].date) : null;
    const firstPlayed = playCount > 0 ? new Date(song.performances[playCount - 1].date) : null;

    // Calculate "days since last played"
    const now = new Date();
    const daysSince = lastPlayed ? Math.floor((now - lastPlayed) / (1000 * 60 * 60 * 24)) : null;



    // Determine back link logic
    const hasHistory = location.state?.from;
    const backLink = hasHistory ? location.state.from : '/songs';

    const getBackLabel = () => {
        if (!hasHistory) return '楽曲一覧に戻る';
        if (backLink === '/dashboard' || backLink === '/mypage') return 'ダッシュボードに戻る';
        if (backLink.startsWith('/live/')) return 'ライブ詳細に戻る';
        return '前に戻る';
    };

    const handleBack = (e) => {
        if (hasHistory) {
            e.preventDefault();
            navigate(-1);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
            <SEO title={`${song.title} - Song Stats`} description={`Performance history of ${song.title} by UVERworld.`} />

            <div className="max-w-4xl mx-auto px-4">
                <Link
                    to={backLink}
                    onClick={handleBack}
                    className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={18} className="mr-2" /> {getBackLabel()}
                </Link>

                {/* Header */}
                {/* Header */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 text-blue-400 font-mono text-sm">
                                <Music size={16} />
                                <span>SONG ANALYTICS</span>
                            </div>
                            {song.is_rare && (
                                <div className="relative group">
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/50 text-amber-400 text-sm font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse cursor-help">
                                        <Sparkles size={14} />
                                        <span>レア曲</span>
                                    </div>
                                    <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-800 border border-slate-600 rounded-lg text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                                        <div className="font-bold text-amber-400 mb-1">レア曲とは？</div>
                                        <div>演奏率が低い（5%以下）または長期間演奏されていない（3年以上）曲のことです。ライブで聴けたらラッキー！✨</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold font-oswald mb-4 flex items-center gap-4">
                            {song.title}
                        </h1>

                        {/* 収録作品セクション */}
                        {song && (() => {
                            const containingReleases = DISCOGRAPHY.filter(release =>
                                release.songs.some(s => s === song.title || s.toLowerCase() === song.title.toLowerCase())
                            );
                            if (containingReleases.length > 0) {
                                return (
                                    <div className="mt-4 pt-4 border-t border-slate-700">
                                        <div className="text-slate-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Disc size={12} /> 収録作品
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {containingReleases.map(release => (
                                                <Link
                                                    to={`/songs#${encodeURIComponent(release.title)}`}
                                                    key={release.title}
                                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all hover:scale-105 ${release.type === 'ALBUM'
                                                        ? 'bg-amber-900/30 text-amber-300 border-amber-600/50 hover:bg-amber-800/40'
                                                        : 'bg-slate-700/50 text-slate-300 border-slate-500/50 hover:bg-slate-600/50'
                                                        }`}
                                                >
                                                    <span className="opacity-70 mr-1">{release.type === 'ALBUM' ? 'ALBUM' : 'SINGLE'}</span>
                                                    {release.title} <span className="opacity-60">({release.date.split('.')[0]})</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}


                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Days Since Last Played - Featured Card */}
                    <div className={`col-span-1 md:col-span-2 p-6 rounded-xl border relative overflow-hidden flex flex-col justify-center ${song.is_rare
                        ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]'
                        : 'bg-slate-800 border-slate-700/50'
                        }`}>
                        <div className="text-slate-400 text-sm mb-2 flex items-center gap-2 uppercase tracking-wide">
                            <Clock size={14} /> 前回の演奏からの経過
                        </div>
                        {song.days_since_last !== null ? (
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-5xl font-bold font-oswald ${song.is_rare ? 'text-amber-400' : 'text-white'}`}>
                                        {song.days_since_last}
                                    </span>
                                    <span className="text-slate-500">日前</span>
                                </div>
                                <div className="text-sm text-slate-400 mt-2">
                                    前回の演奏: <span className="text-white font-mono">{lastPlayed.toISOString().split('T')[0]}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500 italic">ライブ演奏なし</div>
                        )}
                        {song.is_rare && (
                            <div className="absolute top-4 right-4 text-amber-500/20">
                                <Sparkles size={64} />
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700/50 flex flex-col justify-center">
                        <div className="text-slate-400 text-sm mb-2 flex items-center gap-2 uppercase tracking-wide w-fit relative group cursor-help">
                            <Play size={14} /> 総演奏回数
                            <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-slate-900 border border-slate-600 rounded-lg text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl text-left pointer-events-none normal-case tracking-normal">
                                <div className="font-bold text-blue-400 mb-1">総公演数について</div>
                                演奏率の分母（全xx公演）は、この曲が初披露されてから現在までに開催されたライブの総数です。
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white font-oswald flex items-baseline gap-2">
                            {song.total_performances}
                            <span className="text-sm font-normal text-slate-500">回</span>
                        </div>
                        {song.play_rate > 0 && (
                            <div className="w-full bg-slate-700 h-1.5 mt-3 rounded-full overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full rounded-full"
                                    style={{ width: `${Math.min(song.play_rate, 100)}%` }}
                                ></div>
                            </div>
                        )}
                        <div className="text-xs text-slate-500 mt-2 flex justify-between">
                            <span>演奏率: <span className="text-blue-400 font-bold">{song.play_rate}%</span></span>
                            {song.total_possible_lives > 0 && (
                                <span>(全 {song.total_possible_lives} 公演中)</span>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700/50 flex flex-col justify-center">
                        <div className="text-slate-400 text-sm mb-2 flex items-center gap-2 uppercase tracking-wide">
                            <Calendar size={14} /> 初披露
                        </div>
                        <div className="text-lg font-bold font-mono">
                            {song.first_performed_at ? (
                                <span className="text-white">{new Date(song.first_performed_at).toISOString().split('T')[0]}</span>
                            ) : (
                                <span className="text-amber-400">ライブ未披露</span>
                            )}
                        </div>
                        {song.first_performed_at && (
                            <div className="text-xs text-slate-500 mt-1">初めて演奏された日</div>
                        )}
                    </div>
                </div>

                {/* Performance History Controls */}
                <div id="performance-history" className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold font-oswald border-l-4 border-blue-500 pl-4">PERFORMANCE HISTORY</h2>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        {/* Year Filter */}
                        <div className="relative">
                            <select
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="appearance-none bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 pr-8 text-sm focus:outline-none focus:border-blue-500 transition-colors w-full md:w-auto"
                            >
                                <option value="All">全期間</option>
                                {uniqueYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-2.5 text-slate-500 pointer-events-none">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>

                        {/* Type Filter */}
                        <div className="relative">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="appearance-none bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 pr-8 text-sm focus:outline-none focus:border-blue-500 transition-colors w-full md:w-auto"
                            >
                                <option value="All">全タイプ</option>
                                {uniqueTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-2.5 text-slate-500 pointer-events-none">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>

                        {/* Sort Toggle */}
                        <button
                            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors whitespace-nowrap"
                        >
                            <ArrowLeft size={14} className={`transition-transform ${sortOrder === 'oldest' ? '-rotate-90' : 'rotate-90'}`} />
                            {sortOrder === 'newest' ? '新しい順' : '古い順'}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {filteredPerformances.length === 0 ? (
                        <div className="text-slate-500 italic py-8 text-center bg-slate-800/20 rounded-lg">
                            演奏履歴がありません
                        </div>
                    ) : (
                        <>
                            {filteredPerformances.slice(0, visibleCount).map((live) => (
                                <Link to={`/live/${live.id}`} state={{ from: location.pathname }} key={live.id} className="block group">
                                    <div className="bg-slate-800/40 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 transition-colors flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 text-sm text-slate-400 mb-1">
                                                <span className="font-mono">{new Date(live.date).toISOString().split('T')[0]}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold text-white
                                                    ${live.type === 'FESTIVAL' ? 'bg-purple-600' :
                                                        live.type === 'EVENT' ? 'bg-orange-600' :
                                                            'bg-emerald-600'}`}>
                                                    {live.type === 'FESTIVAL' ? 'FESTIVAL' :
                                                        live.type === 'EVENT' ? 'EVENT' :
                                                            'ONE MAN'}
                                                </span>
                                            </div>
                                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                                                {live.tour_name}
                                            </div>
                                            <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                                <MapPin size={12} /> {live.venue}
                                            </div>
                                        </div>
                                        <div className="text-slate-600 group-hover:text-white">
                                            <ArrowLeft size={16} className="rotate-180" />
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {/* Load More Button */}
                            {/* Load More / Close Buttons */}
                            <div className="text-center pt-4">
                                {filteredPerformances.length > visibleCount ? (
                                    <button
                                        onClick={() => {
                                            if (visibleCount < 50) setVisibleCount(50);
                                            else setVisibleCount(filteredPerformances.length);
                                        }}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-6 py-2 rounded-full text-sm font-medium transition-colors border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-2 mx-auto"
                                    >
                                        {visibleCount < 50 ? (
                                            <>もっと見る <ChevronDown size={14} /></>
                                        ) : (
                                            <>全表示 <ChevronsDown size={14} /></>
                                        )}
                                    </button>
                                ) : filteredPerformances.length > 10 ? (
                                    <button
                                        onClick={() => setVisibleCount(10)}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-6 py-2 rounded-full text-sm font-medium transition-colors border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-2 mx-auto"
                                    >
                                        閉じる <ChevronUp size={14} />
                                    </button>
                                ) : null}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SongDetail;
