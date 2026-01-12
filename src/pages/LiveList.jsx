import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Calendar, Tag, Check, Plus } from 'lucide-react';
import { useAttendance } from '../hooks/useAttendance';
import FilterPanel, { PRESET_FILTERS } from '../components/FilterPanel';
import SEO from '../components/SEO';

const LiveList = () => {
    const [lives, setLives] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ text: '', tags: [], venue: '' });
    // Use Attendance Hook
    const { attendedIds, addLive, removeLive, isAttended, loading: attendanceLoading } = useAttendance();

    useEffect(() => {
        fetchLives();
    }, []);

    const fetchLives = async () => {
        try {
            const res = await fetch('http://localhost:4000/api/lives');
            const data = await res.json();
            // Sort by Date Descending
            if (Array.isArray(data)) {
                data.sort((a, b) => new Date(b.date) - new Date(a.date));
                setLives(data);
            } else {
                console.error("API returned non-array:", data);
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
        if (isAttended(liveId)) {
            await removeLive(liveId);
        } else {
            await addLive(liveId);
        }
    };

    const uniqueVenues = useMemo(() => {
        const venues = lives.map(live => live.venue).filter(Boolean);
        return [...new Set(venues)].sort();
    }, [lives]);

    const filteredLives = useMemo(() => {
        return lives.filter(live => {
            // 1. Text Filter
            if (filters.text) {
                const lowerText = filters.text.toLowerCase();
                const matchText =
                    live.tour_name.toLowerCase().includes(lowerText) ||
                    (live.title && live.title.toLowerCase().includes(lowerText)) ||
                    live.venue.toLowerCase().includes(lowerText) ||
                    live.date.includes(lowerText);

                if (!matchText) return false;
            }

            // 2. Tag Filters (Intersection/AND logic)
            if (filters.tags.length > 0) {
                const matchAllTags = filters.tags.every(tagId => {
                    const filter = PRESET_FILTERS.find(f => f.id === tagId);
                    return filter ? filter.match(live) : true;
                });
                if (!matchAllTags) return false;
            }

            // 3. Venue Filter
            if (filters.venue && live.venue !== filters.venue) {
                return false;
            }

            return true;
        });
    }, [lives, filters]);

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
                <div className="flex justify-between items-center mb-8">
                    <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <Home size={18} /> Back to Dashboard
                    </Link>
                    <Link to="/mypage" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors">
                        My Page
                    </Link>
                </div>

                <h1 className="text-4xl font-bold mb-8 text-center font-oswald text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    LIVE ARCHIVE
                </h1>

                {/* Filter Panel */}
                <FilterPanel filters={filters} onChange={setFilters} venues={uniqueVenues} />

                {/* Results */}
                <div className="space-y-4">
                    {filteredLives.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                            No live events found matching your criteria.
                        </div>
                    ) : (
                        filteredLives.map(live => (
                            <Link to={`/lives/${live.id}`} key={live.id} className="block group">
                                <div className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl p-6 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/20 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 transform origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>

                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* Date & Type */}
                                        <div className="md:w-32 flex-shrink-0">
                                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                                <Calendar size={14} />
                                                <span className="text-sm font-mono">{live.date.split('T')[0]}</span>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded text-slate-900 inline-block
                                                ${live.type === 'FESTIVAL' ? 'bg-purple-400' :
                                                    live.type === 'EVENT' ? 'bg-orange-400' :
                                                        'bg-emerald-400'}`}>
                                                {live.type || 'ONEMAN'}
                                            </span>
                                        </div>

                                        {/* Main Info */}
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-xl font-bold text-white mb-1 truncate group-hover:text-blue-400 transition-colors">
                                                {live.tour_name}
                                            </h2>
                                            {live.title && (
                                                <div className="text-blue-200 text-sm font-medium mb-1">
                                                    {live.title}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                <MapPin size={14} />
                                                <span>{live.venue}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={(e) => handleToggleAttendance(e, live.id)}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap z-10 relative
                                                    ${isAttended(live.id)
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'
                                                        : 'bg-slate-700 text-slate-300 border border-transparent hover:bg-slate-600'}`}
                                            >
                                                {isAttended(live.id) ? (
                                                    <><Check size={14} /> Attended</>
                                                ) : (
                                                    <><Plus size={14} /> I Was There</>
                                                )}
                                            </button>

                                            <div className="hidden md:flex items-center text-slate-600 group-hover:text-blue-500 transition-colors">
                                                <ArrowRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                <div className="mt-8 text-center text-slate-500 text-sm">
                    Showing {filteredLives.length} events
                </div>
            </div>
        </div>
    );
};

export default LiveList;
