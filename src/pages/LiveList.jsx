import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/Layout/PageHeader';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, Tag, Check, Plus, ArrowRight, Loader } from 'lucide-react';
import { useAttendance } from '../hooks/useAttendance';
import { useAuth } from '../contexts/AuthContext';
import FilterPanel from '../components/FilterPanel';
import SEO from '../components/SEO';
import './LiveListPrototype.css';

const LiveList = () => {
    const { currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const selectedYear = searchParams.get('year');
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
        // Stop both default Link navigation and event bubbling
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log(`[DEBUG] handleToggleAttendance START - liveId: ${liveId}, user:`, currentUser?.email || 'null');

        if (!currentUser) {
            console.log("[DEBUG] No current user found. Attempting window.confirm...");
            // Force a small timeout to ensure we are out of any weird React event batching if necessary
            // But window.confirm is usually fine in onClick
            const message = "参戦記録をつけるにはログインが必要です。\nログインページに移動しますか？";
            if (window.confirm(message)) {
                console.log("[DEBUG] User confirmed login redirect. Navigating...");
                navigate('/login', { state: { from: location.pathname + location.search } });
            } else {
                console.log("[DEBUG] User cancelled login redirect.");
            }
            return;
        }

        console.log("[DEBUG] User authenticated. Toggling attendance...");
        let success;
        try {
            if (isAttended(liveId)) {
                success = await removeLive(liveId);
            } else {
                success = await addLive(liveId);
            }
        } catch (err) {
            console.error("[DEBUG] Attendance toggle error:", err);
            success = false;
        }

        if (!success) {
            alert("エラーが発生しました。ログイン状態を確認してください。");
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

    const filteredLives = useMemo(() => {
        return lives.filter(live => {
            if (selectedYear) {
                const liveYear = new Date(live.date).getFullYear();
                if (liveYear.toString() !== selectedYear) return false;
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

    useEffect(() => {
        document.body.classList.add('prototype-active');
        return () => {
            document.body.classList.remove('prototype-active');
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900">
                <Loader className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in">
            <div className="prototype-banner">DESIGN PROTOTYPE MODE (IMAGE-BASED LIST VIEW)</div>
            <SEO title="Live Archive" description="Search UVERworld past setlists and live history." />

            <div className="live-list-layout">
                {/* Sidebar Navigation */}
                <aside className="live-sidebar">
                    <div className="sidebar-group">
                        <div className="sidebar-label">YEAR FILTER</div>
                        <div className="sidebar-items">
                            <div
                                className={`sidebar-item ${!selectedYear ? 'active' : ''}`}
                                onClick={() => setSearchParams({})}
                            >
                                <Calendar size={18} className="sidebar-icon" />
                                <span className="sidebar-text">ALL TIME</span>
                                <span className="sidebar-count">{lives.length}</span>
                            </div>
                            {annualSummaries.map(summary => (
                                <div
                                    key={summary.year}
                                    className={`sidebar-item ${selectedYear === summary.year.toString() ? 'active' : ''}`}
                                    onClick={() => setSearchParams({ year: summary.year })}
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
                            現在2015年以降のデータを公開中。2005年のデビューから現在までのライブデータを網羅できるよう、順次アップデートを行っています。
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="live-main-content">
                    <div className="live-main-inner">
                        <header className="archive-header">
                            <div className="header-top-row">
                                <Link to="/" className="header-back-btn">
                                    <ArrowRight size={20} className="rotate-180" />
                                </Link>
                                <h1 className="archive-title">
                                    LIVE TOUR ARCHIVE
                                </h1>
                            </div>
                        </header>

                        {/* モバイル用タブナビゲーション - archive-headerの外に出すことでstickyを効かせる */}
                        <div className="mobile-tab-nav">
                            <div className="mobile-tab-scroll">
                                <button 
                                    className={`mobile-tab-btn ${!selectedYear ? 'active' : ''}`}
                                    onClick={() => setSearchParams({})}
                                >
                                    ALL TIME
                                </button>
                                {annualSummaries.map(summary => (
                                    <button 
                                        key={summary.year}
                                        className={`mobile-tab-btn ${selectedYear === summary.year.toString() ? 'active' : ''}`}
                                        onClick={() => setSearchParams({ year: summary.year })}
                                    >
                                        {summary.year}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="archive-stats-strip">
                            {/* Stats or other elements can go here */}
                        </div>

                        {!selectedYear ? (
                            /* Grouped List View (All Time) */
                            <div className="archive-list-container p-5">
                                {annualSummaries.map(summary => (
                                    <section key={summary.year} className="year-section">
                                        <div className="year-section-header">
                                            <span className="section-year">{summary.year}</span>
                                        </div>
                                        <div className="space-y-4">
                                            {summary.lives.map((live, idx) => (
                                                <Link 
                                                    key={live.id} 
                                                    to={`/live/${live.id}`}
                                                    className="tour-horizontal-card fade-in" 
                                                    style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'flex', overflow: 'hidden' }}
                                                >
                                                    {/* Desktop View: Columns */}
                                                    <div className="card-column tour-name-col desktop-only">
                                                        <label>Tour / Live Title</label>
                                                        <h3 className="tour-name-text">
                                                            <span className={`mobile-type-badge ${
                                                                live.type === 'FESTIVAL' ? 'badge-fes-m' : 
                                                                live.type === 'EVENT' ? 'badge-event-m' : 'badge-oneman-m'
                                                            }`}>
                                                                {live.type === 'FESTIVAL' ? 'FES' : 
                                                                 live.type === 'EVENT' ? 'EVENT' : 'ONE-MAN'}
                                                            </span>
                                                            <span className="title-text-wrap">
                                                                {live.title || live.tour_name}
                                                            </span>
                                                        </h3>
                                                    </div>
                                                    <div className="card-column period-col desktop-only">
                                                        <label>Date</label>
                                                        <div className="period-text">
                                                            {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                                                        </div>
                                                    </div>
                                                              {/* Mobile View: Integrated Info Area */}
                                                    <div className="card-main-info mobile-only">
                                                        <div className="card-header-row">
                                                            <span className="card-date-text">
                                                                {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                                                            </span>
                                                            <span className={`mobile-type-badge ${
                                                                live.type === 'FESTIVAL' ? 'badge-fes-m' : 
                                                                live.type === 'EVENT' ? 'badge-event-m' : 'badge-oneman-m'
                                                            }`}>
                                                                {live.type === 'FESTIVAL' ? 'FES' : 
                                                                 live.type === 'EVENT' ? 'EVENT' : 'ONE-MAN'}
                                                            </span>
                                                        </div>
                                                        <h3 className="card-title-text">
                                                            {live.title || live.tour_name}
                                                        </h3>
                                                        <div className="card-venue-row">
                                                            <MapPin size={14} />
                                                            <span>{live.venue}</span>
                                                        </div>
                                                    </div>

                                                    {/* Actions Area (Attendance Toggle) */}
                                                    <div className="card-actions-col">
                                                        <div 
                                                            className={`card-action-btn-mock ${isAttended(live.id) ? 'attended' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleAttendance(e, live.id);
                                                            }}
                                                        >
                                                            {isAttended(live.id) ? (
                                                                <>
                                                                    <Check size={14} strokeWidth={3} />
                                                                    <span>参戦済</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus size={14} strokeWidth={3} />
                                                                    <span>参戦記録</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="card-arrow-link desktop-only">
                                                            <ArrowRight size={20} />
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            /* Specific Year View (Flat List) */
                            <div className="filtered-list-container">
                                <h2 className="fade-in">{selectedYear} ARCHIVE ({filteredLives.length})</h2>
                                <div className="space-y-4">
                                    {filteredLives.map((live, idx) => (
                                        <Link 
                                            key={live.id} 
                                            to={`/live/${live.id}`}
                                            className="tour-horizontal-card fade-in"
                                            style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'flex', overflow: 'hidden' }}
                                        >
                                             {/* Desktop View: Columns */}
                                             <div className="card-column tour-name-col desktop-only">
                                                 <label>Tour / Live Title</label>
                                                 <h3 className="tour-name-text">
                                                     <span className={`mobile-type-badge ${
                                                         live.type === 'FESTIVAL' ? 'badge-fes-m' : 
                                                         live.type === 'EVENT' ? 'badge-event-m' : 'badge-oneman-m'
                                                     }`}>
                                                         {live.type === 'FESTIVAL' ? 'FES' : 
                                                          live.type === 'EVENT' ? 'EVENT' : 'ONE-MAN'}
                                                     </span>
                                                     <span className="title-text-wrap">
                                                         {live.title || live.tour_name}
                                                     </span>
                                                 </h3>
                                             </div>
                                             <div className="card-column period-col desktop-only">
                                                 <label>Date</label>
                                                 <div className="period-text">
                                                     {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                                                 </div>
                                             </div>
                                             <div className="card-column shows-col desktop-only">
                                                 <label>Venue</label>
                                                 <div className="shows-text">{live.venue}</div>
                                             </div>

                                             {/* Mobile View: Integrated Info Area */}
                                             <div className="card-main-info mobile-only">
                                                 <div className="card-header-row">
                                                     <span className="card-date-text">
                                                         {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                                                     </span>
                                                     <span className={`mobile-type-badge ${
                                                         live.type === 'FESTIVAL' ? 'badge-fes-m' : 
                                                         live.type === 'EVENT' ? 'badge-event-m' : 'badge-oneman-m'
                                                     }`}>
                                                         {live.type === 'FESTIVAL' ? 'FES' : 
                                                          live.type === 'EVENT' ? 'EVENT' : 'ONE-MAN'}
                                                     </span>
                                                 </div>
                                                 <h3 className="card-title-text">
                                                     {live.title || live.tour_name}
                                                 </h3>
                                                 <div className="card-venue-row">
                                                     <MapPin size={14} />
                                                     <span>{live.venue}</span>
                                                 </div>
                                             </div>

                                             {/* Actions Area */}
                                             <div className="card-actions-col">
                                                 <div 
                                                     className={`card-action-btn-mock ${isAttended(live.id) ? 'attended' : ''}`}
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         handleToggleAttendance(e, live.id);
                                                     }}
                                                 >
                                                     {isAttended(live.id) ? (
                                                         <>
                                                             <Check size={14} strokeWidth={3} />
                                                             <span>参戦済</span>
                                                         </>
                                                     ) : (
                                                         <>
                                                             <Plus size={14} strokeWidth={3} />
                                                             <span>参戦記録</span>
                                                         </>
                                                     )}
                                                 </div>
                                                 <div className="card-arrow-link desktop-only">
                                                     <ArrowRight size={20} />
                                                 </div>
                                             </div>
                                        </Link>
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
