import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, ArrowUpDown } from 'lucide-react';

const AttendedLiveList = ({ lives }) => {
    const [searchText, setSearchText] = useState('');
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (newest first) or 'asc' (oldest first)
    const [selectedYear, setSelectedYear] = useState('ALL');

    // Extract unique years from lives for the filter dropdown
    const years = useMemo(() => {
        const uniqueYears = [...new Set(lives.map(live => new Date(live.date).getFullYear()))];
        return uniqueYears.sort((a, b) => b - a);
    }, [lives]);

    // Filter and Sort Logic
    const filteredAndSortedLives = useMemo(() => {
        let result = [...lives];

        // 1. Filter by Year
        if (selectedYear !== 'ALL') {
            result = result.filter(live => new Date(live.date).getFullYear().toString() === selectedYear);
        }

        // 2. Filter by Search Text (Tour Name or Venue)
        if (searchText) {
            const lowerText = searchText.toLowerCase();
            result = result.filter(live =>
                (live.tour_name && live.tour_name.toLowerCase().includes(lowerText)) ||
                (live.venue && live.venue.toLowerCase().includes(lowerText))
            );
        }

        // 3. Sort
        result.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [lives, selectedYear, searchText, sortOrder]);

    const toggleSort = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    return (
        <div className="dashboard-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px', flexShrink: 0 }}>
                <h3>参戦履歴</h3>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="ツアー名・会場で検索..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{
                                padding: '8px 8px 8px 35px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontSize: '0.9rem',
                                width: '200px'
                            }}
                        />
                    </div>

                    {/* Year Filter */}
                    <div style={{ position: 'relative' }}>
                        <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={{
                                padding: '8px 8px 8px 35px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontSize: '0.9rem',
                                appearance: 'none',
                                cursor: 'pointer',
                                paddingRight: '30px'
                            }}
                        >
                            <option value="ALL">全期間</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year}年</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort Toggle */}
                    <button
                        onClick={toggleSort}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                    >
                        <ArrowUpDown size={16} />
                        {sortOrder === 'desc' ? '新しい順' : '古い順'}
                    </button>
                </div>
            </div>

            {/* List Area */}
            <div className="live-list-compact" style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', minHeight: 0 }}>
                {filteredAndSortedLives.length > 0 ? (
                    filteredAndSortedLives.map((live) => {
                        const d = new Date(live.date);
                        return (
                            <Link key={live.id} to={`/live/${live.id}`} className="compact-live-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px' }}>
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    width: '60px', flexShrink: 0
                                }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1 }}>{d.getFullYear()}</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-color)', lineHeight: 1.2, fontFamily: 'Oswald, sans-serif' }}>
                                        {String(d.getMonth() + 1).padStart(2, '0')}.{String(d.getDate()).padStart(2, '0')}
                                    </span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px', lineHeight: 1.3, color: 'white' }}>
                                        {live.tour_name}
                                        {live.special_note && <span style={{ color: '#fbbf24', marginLeft: '8px' }}>({live.special_note})</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        <MapPin size={12} />
                                        <span>{live.venue}</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        条件に一致するライブが見つかりませんでした。
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendedLiveList;
