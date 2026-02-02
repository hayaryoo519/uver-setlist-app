import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/Layout/PageHeader';
import { Link, useLocation } from 'react-router-dom';
import { Search, MapPin, Calendar, Tag, Check, Plus, ArrowRight, Loader, Home } from 'lucide-react';
import { useAttendance } from '../hooks/useAttendance';
import FilterPanel from '../components/FilterPanel';
import SEO from '../components/SEO';

const LiveList = () => {
    const location = useLocation();
    const [lives, setLives] = useState([]);
    const [availableSongs, setAvailableSongs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // filters state: songIds is array of integers, album is string
    const [filters, setFilters] = useState({ text: '', venue: '', songIds: [], startDate: '', endDate: '' });
    // Use Attendance Hook
    const { attendedIds, addLive, removeLive, isAttended, loading: attendanceLoading } = useAttendance();

    useEffect(() => {
        // Fetch Dictionary Data (Songs)
        const fetchSongs = async () => {
            try {
                const res = await fetch('/api/songs');
                const data = await res.json();
                setAvailableSongs(data);
            } catch (error) {
                console.error('Error fetching songs:', error);
            }
        };
        fetchSongs();
    }, []);

    useEffect(() => {
        // Fetch Lives (server-side filter for complex relations)
        fetchLives();
    }, [filters.songIds, filters.startDate, filters.endDate]);

    const fetchLives = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.songIds.length > 0) {
                params.append('songIds', filters.songIds.join(','));
            }
            if (filters.startDate) {
                params.append('startDate', filters.startDate);
            }
            if (filters.endDate) {
                params.append('endDate', filters.endDate);
            }

            // Note: We fetch ALL lives (filtered by heavy constraints) 
            // and do lightweight filtering (Title, Venue, Tags) on client.
            const res = await fetch(`/api/lives?${params.toString()}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                // Ensure date object for sorting (though backend sends ISO string)
                data.sort((a, b) => new Date(b.date) - new Date(a.date));

                // Filter out future lives (Dashboard shows them as Upcoming)
                // Archive should only show past lives (date < today)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const pastLives = data.filter(live => new Date(live.date) < today);

                setLives(pastLives);
            } else {
                setLives([]);
            }
        } catch (error) {
            console.error('Error fetching lives:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleAttendance = async (e, liveId) => {
        e.preventDefault();
        e.stopPropagation();

        let success;
        if (isAttended(liveId)) {
            success = await removeLive(liveId);
        } else {
            success = await addLive(liveId);
        }

        if (!success) {
            const shouldLogin = window.confirm("参戦記録をつけるにはログインが必要です。\nログインページに移動しますか？");
            if (shouldLogin) {
                window.location.href = '/login';
            }
        }
    };

    // uniqueVenues calculation removed per user request (Filter removed)

    const filteredLives = useMemo(() => {
        return lives.filter(live => {
            // 1. Text Filter
            if (filters.text) {
                const lowerText = filters.text.toLowerCase();
                const matchText =
                    live.tour_name.toLowerCase().includes(lowerText) ||
                    (live.title && live.title.toLowerCase().includes(lowerText)) ||
                    live.venue.toLowerCase().includes(lowerText) ||
                    new Date(live.date).toISOString().includes(lowerText);

                if (!matchText) return false;
            }


            // 3. Venue Filter
            // Note: If venue logic moves to backend, remove this. Keeping client-side for now.
            if (filters.venue && live.venue !== filters.venue) {
                return false;
            }

            return true;
        });
    }, [lives, filters.text, filters.venue]);

    const [isFilterOpen, setIsFilterOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900">
                <Loader className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
            <SEO title="Live Archive" description="Search UVERworld past setlists and live history." />

            <div className="max-w-4xl mx-auto px-4">
                {/* Header Navigation */}
                <div className="flex justify-end items-center mb-6">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all border
                            ${isFilterOpen ? 'bg-slate-700 border-slate-600 text-white' : 'bg-transparent border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                        >
                            <Search size={16} /> 絞り込み
                        </button>
                        <Link to="/mypage" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors">
                            My Page
                        </Link>
                    </div>
                </div>

                <PageHeader
                    title="LIVE ARCHIVE"
                    rightElement={
                        <div className="text-slate-500 text-sm font-mono">
                            {filteredLives.length} 件の公演が見つかりました
                        </div>
                    }
                />

                {/* Collapsible Filter Panel */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-[800px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'}`}>
                    <FilterPanel
                        filters={filters}
                        onChange={setFilters}
                        songs={availableSongs}
                    />
                </div>

                {/* Results */}
                <div className="space-y-4">
                    {filteredLives.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                            条件に一致する公演は見つかりませんでした。
                        </div>
                    ) : (
                        filteredLives.map(live => (
                            <Link to={`/live/${live.id}`} state={{ from: location.pathname }} key={live.id} className="block group">
                                <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl px-4 py-3 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/20 relative overflow-hidden">
                                    {/* Left accent border */}
                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-700 group-hover:bg-blue-500 transition-colors duration-300"></div>

                                    <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 pl-3">
                                        {/* Date Section */}
                                        <div className="w-full md:w-28 flex-shrink-0 flex flex-row md:flex-col items-center md:items-start gap-2 md:gap-1 md:justify-start pt-0.5">
                                            <div className="flex items-center gap-2">
                                                <div className="text-xl md:text-2xl font-bold font-oswald text-slate-300 group-hover:text-white leading-none">
                                                    {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '.')}
                                                </div>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white inline-block
                                                    ${live.type === 'FESTIVAL' ? 'bg-purple-600' :
                                                        live.type === 'EVENT' ? 'bg-orange-600' :
                                                            'bg-emerald-600'}`}>
                                                    {live.type === 'FESTIVAL' ? 'FESTIVAL' :
                                                        live.type === 'EVENT' ? 'EVENT' :
                                                            'ONE MAN'}
                                                </span>
                                            </div>

                                            {/* Mobile Button */}
                                            <button
                                                onClick={(e) => handleToggleAttendance(e, live.id)}
                                                className={`md:hidden ml-auto px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-200 flex items-center gap-1 whitespace-nowrap z-10 relative
                                                    ${isAttended(live.id)
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'
                                                        : 'bg-slate-700 text-slate-300 border border-transparent hover:bg-slate-600'}`}
                                            >
                                                {isAttended(live.id) ? (
                                                    <><Check size={10} /> 参戦済み</>
                                                ) : (
                                                    <><Plus size={10} /> 参戦記録</>
                                                )}
                                            </button>
                                        </div>

                                        {/* Main Info */}
                                        <div className="flex-1 min-w-0 md:border-l border-slate-700/50 md:pl-4">
                                            <h2 className="text-lg md:text-xl font-bold text-white leading-tight group-hover:text-blue-400 transition-colors" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {live.tour_name}
                                            </h2>
                                            {live.title && live.title !== live.tour_name && (
                                                <div className="text-blue-200 text-xs font-medium mt-0.5 flex items-center gap-1">
                                                    <Tag size={10} /> {live.title}
                                                </div>
                                            )}
                                            {live.special_note && (
                                                <div className="text-yellow-400 text-xs font-bold mt-1 flex items-center gap-1">
                                                    <span className="bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 rounded">
                                                        {live.special_note}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center gap-1 text-slate-400 text-xs group-hover:text-slate-300">
                                                    <MapPin size={12} className="text-secondary-color" />
                                                    <span className="font-medium">{live.venue}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions (Desktop Only) */}
                                        <div className="hidden md:flex items-center justify-start gap-3 pl-0 border-t border-slate-700/50 pt-0 mt-0 md:border-none">
                                            <button
                                                onClick={(e) => handleToggleAttendance(e, live.id)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-200 flex items-center gap-1 whitespace-nowrap z-10 relative
                                                    ${isAttended(live.id)
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'
                                                        : 'bg-slate-700 text-slate-300 border border-transparent hover:bg-slate-600'}`}
                                            >
                                                {isAttended(live.id) ? (
                                                    <><Check size={10} /> 参戦済み</>
                                                ) : (
                                                    <><Plus size={10} /> 参戦記録</>
                                                )}
                                            </button>

                                            <div className="flex items-center text-slate-600 group-hover:text-blue-500 transition-colors">
                                                <ArrowRight size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                <div className="mt-8 text-center text-slate-600 text-xs">
                    END OF ARCHIVE
                </div>
            </div>
        </div>
    );
};

export default LiveList;
