import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Music, Calendar, MapPin, Play, Clock, ArrowLeft, Loader, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';

const SongDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const [song, setSong] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
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
                }
            } catch (error) {
                console.error("Error:", error);
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

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
            <SEO title={`${song.title} - Song Stats`} description={`Performance history of ${song.title} by UVERworld.`} />

            <div className="max-w-4xl mx-auto px-4">
                <Link to="/lives" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft size={18} className="mr-2" /> Back to Archives
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
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/50 text-amber-400 text-sm font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
                                    <Sparkles size={14} />
                                    <span>RARE SONG</span>
                                </div>
                            )}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold font-oswald mb-4 flex items-center gap-4">
                            {song.title}
                        </h1>

                        <div className="flex flex-wrap gap-6 text-slate-300">
                            {song.album && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-xs uppercase tracking-wider">ALBUM</span>
                                    <span>{song.album}</span>
                                </div>
                            )}
                            {song.release_year && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-xs uppercase tracking-wider">YEAR</span>
                                    <span>{song.release_year}</span>
                                </div>
                            )}
                        </div>


                    </div>
                </div>

                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => document.getElementById('performance-history')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-bold uppercase text-sm tracking-wider transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        <Calendar size={16} />
                        View Performance History
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Days Since Last Played - Featured Card */}
                    <div className={`col-span-1 md:col-span-2 p-6 rounded-xl border relative overflow-hidden flex flex-col justify-center ${song.is_rare
                        ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]'
                        : 'bg-slate-800 border-slate-700/50'
                        }`}>
                        <div className="text-slate-400 text-sm mb-2 flex items-center gap-2 uppercase tracking-wide">
                            <Clock size={14} /> Time Since Last Performance
                        </div>
                        {song.days_since_last !== null ? (
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-5xl font-bold font-oswald ${song.is_rare ? 'text-amber-400' : 'text-white'}`}>
                                        {song.days_since_last}
                                    </span>
                                    <span className="text-slate-500">days ago</span>
                                </div>
                                <div className="text-sm text-slate-400 mt-2">
                                    Last played on <span className="text-white font-mono">{lastPlayed.toISOString().split('T')[0]}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500 italic">Never performed live</div>
                        )}
                        {song.is_rare && (
                            <div className="absolute top-4 right-4 text-amber-500/20">
                                <Sparkles size={64} />
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700/50 flex flex-col justify-center">
                        <div className="text-slate-400 text-sm mb-2 flex items-center gap-2 uppercase tracking-wide">
                            <Play size={14} /> Total Plays
                        </div>
                        <div className="text-3xl font-bold text-white font-oswald flex items-baseline gap-2">
                            {song.total_performances}
                            <span className="text-sm font-normal text-slate-500">times</span>
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
                            <span>Play Rate: <span className="text-blue-400 font-bold">{song.play_rate}%</span></span>
                            <span>(of {song.total_possible_lives || '?'} lives)</span>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700/50 flex flex-col justify-center">
                        <div className="text-slate-400 text-sm mb-2 flex items-center gap-2 uppercase tracking-wide">
                            <Calendar size={14} /> Live Debut
                        </div>
                        <div className="text-lg font-bold text-white font-mono">
                            {song.first_performed_at ? new Date(song.first_performed_at).toISOString().split('T')[0] : 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">First time played</div>
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
                                <option value="All">All Years</option>
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
                                <option value="All">All Types</option>
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
                            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {filteredPerformances.length === 0 ? (
                        <div className="text-slate-500 italic py-8 text-center bg-slate-800/20 rounded-lg">
                            No performances found matching "{filterText}"
                        </div>
                    ) : (
                        <>
                            {filteredPerformances.slice(0, visibleCount).map((live) => (
                                <Link to={`/live/${live.id}`} key={live.id} className="block group">
                                    <div className="bg-slate-800/40 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 transition-colors flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 text-sm text-slate-400 mb-1">
                                                <span className="font-mono">{new Date(live.date).toISOString().split('T')[0]}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded ${live.type === 'FESTIVAL' ? 'bg-purple-900 text-purple-200' :
                                                    live.type === 'EVENT' ? 'bg-orange-900 text-orange-200' :
                                                        live.type === 'ARENA' ? 'bg-blue-900 text-blue-200' : // Arena specific
                                                            'bg-emerald-900 text-white'
                                                    }`}>
                                                    {live.type || 'ONEMAN'}
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
                            {filteredPerformances.length > visibleCount && (
                                <div className="text-center pt-4">
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 20)}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-6 py-2 rounded-full text-sm font-medium transition-colors border border-slate-700 hover:border-slate-600"
                                    >
                                        Show More ({filteredPerformances.length - visibleCount} remaining)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div >
    );
};

export default SongDetail;
