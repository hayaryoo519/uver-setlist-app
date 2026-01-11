import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { lives } from '../data/lives';
import { getAttendedLives, toggleAttendance } from '../utils/storage';
import MainVisual from '../components/Visual/MainVisual';
import SearchFilters from '../components/Search/SearchFilters';
import SEO from '../components/SEO';
import { Home } from 'lucide-react';
import LiveListSkeleton from '../components/Skeleton/LiveListSkeleton';

function LiveList() {
    const [isLoading, setIsLoading] = useState(true);
    // Initial state
    const [filters, setFilters] = useState({
        keyword: '',
        year: 'All',
        prefecture: 'All',
        types: ['Arena', 'LiveHouse', 'Hall', 'Festival'],
        availableYears: []
    });

    const [attendedLiveIds, setAttendedLiveIds] = useState([]);

    useEffect(() => {
        setAttendedLiveIds(getAttendedLives());
        // Simulate loading for production feel
        setTimeout(() => setIsLoading(false), 800);
    }, []);

    const handleToggle = (e, liveId) => {
        e.preventDefault();
        const updated = toggleAttendance(liveId);
        setAttendedLiveIds(updated);
    };

    // Extract unique years
    const years = useMemo(() => {
        const allYears = lives.map(live => live.date.split('-')[0]);
        return ['All', ...new Set(allYears)].sort().reverse();
    }, []);

    // Update available years in filters when years change
    useEffect(() => {
        setFilters(prev => ({ ...prev, availableYears: years.filter(y => y !== 'All') }));
    }, [years]);

    // Filter logic
    const filteredLives = useMemo(() => {
        return lives.filter(live => {
            // Year
            const matchYear = filters.year === 'All' || live.date.startsWith(filters.year);

            // Keyword
            const searchLower = filters.keyword.toLowerCase();
            const matchSearch =
                live.tourTitle.toLowerCase().includes(searchLower) ||
                live.venue.toLowerCase().includes(searchLower);

            // Prefecture
            const matchPref = filters.prefecture === 'All' || live.prefecture === filters.prefecture;

            // Venue Type
            const matchType = filters.types.includes(live.type || 'Unknown');

            return matchYear && matchSearch && matchPref && matchType;
        });
    }, [filters]);

    return (
        <div className="page-wrapper" style={{ paddingTop: '100px' }}>
            <SEO title="Live Archive" description="Search UVERworld past setlists and live history." />
            <div className="container">
                <div style={{ marginBottom: '20px' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#94a3b8', textDecoration: 'none' }}>
                        <Home size={16} /> Back to Dashboard
                    </Link>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Live Archive</h2>
                    <Link to="/mypage" className="btn-primary">My Page</Link>
                </div>

                <SearchFilters filters={filters} onFilterChange={setFilters} />

                <div className="live-list">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <LiveListSkeleton key={i} />)
                    ) : filteredLives.length > 0 ? (
                        filteredLives.map((live) => (
                            <div key={live.id} className="live-card" style={{
                                backgroundColor: 'var(--card-bg)',
                                padding: '20px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                borderLeft: `4px solid ${filters.types.length < 4 ? 'var(--primary-color)' : 'var(--accent-color)'}`
                            }}>
                                <Link to={`/live/${live.id}`} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{live.date} @ {live.venue}</div>
                                        <h2 style={{ fontSize: '1.2rem', margin: '8px 0' }}>{live.tourTitle}</h2>
                                        <div style={{ color: 'var(--accent-color)', fontSize: '0.9rem' }}>Setslist →</div>
                                    </div>
                                    <button
                                        onClick={(e) => handleToggle(e, live.id)}
                                        style={{
                                            backgroundColor: attendedLiveIds.includes(live.id) ? 'var(--accent-color)' : '#334155',
                                            color: attendedLiveIds.includes(live.id) ? '#0f172a' : 'white',
                                            border: 'none',
                                            borderRadius: '999px',
                                            padding: '8px 16px',
                                            fontSize: '0.9rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            whiteSpace: 'nowrap',
                                            marginLeft: '15px',
                                            transition: 'all 0.2s'
                                        }}
                                        title={attendedLiveIds.includes(live.id) ? "Remove from history" : "Add to history"}
                                    >
                                        {attendedLiveIds.includes(live.id) ? '✓ 参戦済み' : '+ 参戦記録をつける'}
                                    </button>
                                </Link>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#94a3b8' }}>No lives found matching your criteria.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LiveList;
