import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/Layout/PageHeader';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Tag, Check, Plus, ArrowRight, Loader } from 'lucide-react';
import { useAttendance } from '../hooks/useAttendance';
import FilterPanel from '../components/FilterPanel';
import SEO from '../components/SEO';
import './LiveListPrototype.css';

const LiveList = () => {
    const location = useLocation();
    const [lives, setLives] = useState([]);
    const [availableSongs, setAvailableSongs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // filters state: songIds is array of integers, album is string
    const initialFilters = location.state?.filters || { text: '', venue: '', songIds: [], startDate: '', endDate: '' };
    const [filters, setFilters] = useState(initialFilters);
    const [selectedTour, setSelectedTour] = useState(null);
    const navigate = useNavigate();

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        // 現在の履歴エントリにfiltersを保存し、ブラウザの「戻る」ボタン使用時に復元できるようにする
        navigate(location.pathname, { replace: true, state: { filters: newFilters } });
    };

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

            const res = await fetch(`/api/lives?${params.toString()}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                data.sort((a, b) => new Date(b.date) - new Date(a.date));

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

    // Calculate Annual Summaries for grouped List view
    const annualSummaries = useMemo(() => {
        const summaries = {};
        
        lives.forEach(live => {
            if (!live.date) return;
            const year = new Date(live.date).getFullYear();
            
            if (!summaries[year]) {
                summaries[year] = {
                    year,
                    performanceCount: 0,
                    lives: []
                };
            }
            
            summaries[year].performanceCount += 1;
            summaries[year].lives.push(live);
        });
        
        return Object.values(summaries).map(s => ({
            ...s,
            lives: s.lives.sort((a, b) => new Date(b.date) - new Date(a.date))
        })).sort((a, b) => b.year - a.year);
    }, [lives]);

    const years = useMemo(() => annualSummaries.map(s => s.year), [annualSummaries]);

    const [selectedYear, setSelectedYear] = useState(null);

    const filteredLives = useMemo(() => {
        return lives.filter(live => {
            if (selectedYear) {
                const liveYear = new Date(live.date).getFullYear();
                if (liveYear !== selectedYear) return false;
            }

            if (filters.text) {
                const lowerText = filters.text.toLowerCase();
                const matchText =
                    live.tour_name.toLowerCase().includes(lowerText) ||
                    (live.title && live.title.toLowerCase().includes(lowerText)) ||
                    live.venue.toLowerCase().includes(lowerText) ||
                    new Date(live.date).toISOString().includes(lowerText);

                if (!matchText) return false;
            }

            if (filters.venue && live.venue !== filters.venue) {
                return false;
            }

            return true;
        });
    }, [lives, filters.text, filters.venue, selectedYear]);

    const [isFilterOpen, setIsFilterOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900">
                <Loader className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in prototype-active">
            <div className="prototype-banner">DESIGN PROTOTYPE MODE (IMAGE-BASED LIST VIEW)</div>
            <SEO title="Live Archive" description="Search UVERworld past setlists and live history." />

            <div className="live-list-layout">
                {/* Sidebar Navigation */}
                <aside className="live-sidebar">
                    <div className="sidebar-group">
                        <div className="sidebar-label">YEAR FILTER</div>
                        <div className="sidebar-items">
                            <div
                                className={`sidebar-item ${selectedYear === null ? 'active' : ''}`}
                                onClick={() => setSelectedYear(null)}
                            >
                                <Calendar size={18} className="sidebar-icon" />
                                <span className="sidebar-text">ALL TIME</span>
                                <span className="sidebar-count">{lives.length}</span>
                            </div>
                            {annualSummaries.map(summary => (
                                <div
                                    key={summary.year}
                                    className={`sidebar-item ${selectedYear === summary.year ? 'active' : ''}`}
                                    onClick={() => setSelectedYear(summary.year)}
                                >
                                    <Calendar size={18} className="sidebar-icon" />
                                    <span className="sidebar-text">{summary.year}</span>
                                    <span className="sidebar-count">{summary.performanceCount}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="sidebar-info-box">
                        <div className="info-icon">i</div>
                        <div className="info-title">アーカイブについて</div>
                        <div className="info-content">
                            2005年のデビューから現在までの全てのライブデータを網羅。セットリスト、会場、動員数などを記録しています。
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="live-main-content">
                    <div className="live-main-inner">
                        <header className="archive-header">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="archive-title">
                                        LIVE TOUR <span className="accent-italic">ARCHIVE</span>
                                    </h1>
                                    <p className="archive-subtitle">
                                        UVERworldの軌跡を辿る、全公演のセットリスト記録
                                    </p>
                                </div>
                            </div>
                        </header>

                        {!selectedYear ? (
                            /* Grouped List View (All Time) */
                            <div className="archive-list-container">
                                {annualSummaries.map(summary => (
                                    <section key={summary.year} className="year-section">
                                        <div className="year-section-header">
                                            <span className="section-year">{summary.year}</span>
                                            <span className="section-stat">{summary.performanceCount} PERFORMANCES</span>
                                        </div>
                                        <div className="space-y-4">
                                            {summary.lives.map((live, idx) => (
                                                <div 
                                                    key={live.id} 
                                                    className="tour-horizontal-card fade-in" 
                                                    style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
                                                    onClick={() => navigate(`/live/${live.id}`)}
                                                >
                                                        {/* LEFT: Date & Type Badge */}
                                                        <div className="date-col">
                                                            <div className="date-text">
                                                                {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                                                            </div>
                                                            <span className={`type-badge ${
                                                                live.type === 'FESTIVAL' ? 'badge-fes' : 
                                                                live.type === 'EVENT' ? 'badge-event' : 'badge-oneman'
                                                            }`}>
                                                                {live.type === 'FESTIVAL' ? 'FES' : 
                                                                 live.type === 'EVENT' ? 'EVENT' : 'ONE-MAN'}
                                                            </span>
                                                        </div>

                                                        {/* MIDDLE: Title, Special Badge, Venue */}
                                                        <div className="content-mid-col">
                                                            <h3 className="live-title">{live.title || live.tour_name}</h3>
                                                            {live.special_note && (
                                                                <div>
                                                                    <span className="badge-special">{live.special_note}</span>
                                                                </div>
                                                            )}
                                                            <div className="venue-row">
                                                                <div className="venue-icon">
                                                                    <MapPin size={14} />
                                                                </div>
                                                                <span className="venues-text">{live.venue}</span>
                                                            </div>
                                                        </div>

                                                        {/* RIGHT: Actions */}
                                                        <div className="card-actions-col">
                                                            <button 
                                                                className={`btn-checkin-pill ${isAttended(live.id) ? 'attended' : ''}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Added stopPropagation
                                                                    handleToggleAttendance(e, live.id);
                                                                }}
                                                            >
                                                                <span>+</span> 参戦記録
                                                            </button>
                                                            <Link to={`/live/${live.id}`} className="card-arrow-link">
                                                                <ArrowRight size={20} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            /* Specific Year View (Flat List) */
                            <div className="filtered-list-container">
                                <div className="section-header-back" onClick={() => setSelectedYear(null)}>
                                    <span className="back-arrow">←</span>
                                    <span className="back-text">BACK TO ALL TIME</span>
                                </div>
                                <h2 className="fade-in">{selectedYear} ARCHIVE ({filteredLives.length})</h2>
                                <div className="space-y-4 mt-6">
                                    {filteredLives.map((live, idx) => (
                                        <div 
                                            key={live.id} 
                                            className="tour-horizontal-card fade-in"
                                            style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
                                            onClick={() => navigate(`/live/${live.id}`)}
                                        >
                                            {/* LEFT: Date & Type Badge */}
                                            <div className="date-col">
                                                <div className="date-text">
                                                    {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                                                </div>
                                                <span className={`type-badge ${
                                                    live.type === 'FESTIVAL' ? 'badge-fes' : 
                                                    live.type === 'EVENT' ? 'badge-event' : 'badge-oneman'
                                                }`}>
                                                    {live.type === 'FESTIVAL' ? 'FES' : 
                                                     live.type === 'EVENT' ? 'EVENT' : 'ONE-MAN'}
                                                </span>
                                            </div>

                                            {/* MIDDLE: Title, Special Badge, Venue */}
                                            <div className="content-mid-col">
                                                <h3 className="live-title">{live.title || live.tour_name}</h3>
                                                {live.special_note && (
                                                    <div>
                                                        <span className="badge-special">{live.special_note}</span>
                                                    </div>
                                                )}
                                                <div className="venue-row">
                                                    <div className="venue-icon">
                                                        <MapPin size={14} />
                                                    </div>
                                                    <span className="venues-text">{live.venue}</span>
                                                </div>
                                            </div>

                                            {/* RIGHT: Actions */}
                                            <div className="card-actions-col">
                                                <button 
                                                    className={`btn-checkin-pill ${isAttended(live.id) ? 'attended' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Added stopPropagation
                                                        handleToggleAttendance(e, live.id);
                                                    }}
                                                >
                                                    <span>+</span> 参戦記録
                                                </button>
                                                <Link to={`/live/${live.id}`} className="card-arrow-link">
                                                    <ArrowRight size={20} />
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LiveList;
