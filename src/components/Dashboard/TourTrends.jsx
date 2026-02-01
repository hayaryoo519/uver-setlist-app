import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Music, X, ArrowRight, ArrowUpDown, ChevronsDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const TourTrends = ({ tour }) => {
    const location = useLocation();
    if (!tour || !tour.songRanking) return null;

    const [viewMode, setViewMode] = useState(0); // 0: Top 5, 1: Top 20, 2: All
    const [selectedSong, setSelectedSong] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'count', direction: 'desc' });

    // Handle Sort
    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // Pre-calculate rank to persist across sorts
    const rankedData = tour.songRanking.map((s, i) => ({ ...s, rank: i + 1 }));

    // Sort Data
    const sortedRanking = [...rankedData].sort((a, b) => {
        if (sortConfig.key === 'count') {
            return sortConfig.direction === 'desc'
                ? b.count - a.count
                : a.count - b.count;
        }
        if (sortConfig.key === 'title') {
            return sortConfig.direction === 'desc'
                ? b.title.localeCompare(a.title)
                : a.title.localeCompare(b.title);
        }
        return 0;
    });

    // Display Limit Logic
    const LIMITS = [5, 20, Infinity];
    const displayCount = LIMITS[viewMode];
    const songs = sortedRanking.slice(0, displayCount);

    // Show button if total items exceed current view or we are expanded
    const totalSongs = tour.songRanking.length;
    const showButton = totalSongs > 5;

    return (
        <div className="dashboard-panel" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginLeft: '2px' }}>
                        {tour.name} <span style={{ fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 'normal' }}>({tour.liveCount} 公演)</span>
                    </div>
                </div>
            </div>

            {/* Sort Headers */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 15px 8px 15px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginBottom: '5px'
            }}>
                <div
                    onClick={() => handleSort('title')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    className="hover:text-white"
                >
                    曲名 {sortConfig.key === 'title' && <ArrowUpDown size={12} />}
                </div>
                <div
                    onClick={() => handleSort('count')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    className="hover:text-white"
                >
                    回数 {sortConfig.key === 'count' && <ArrowUpDown size={12} />}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0' }}>
                {songs.map((song, index) => (
                    <div
                        key={index}
                        onClick={() => setSelectedSong(song)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 15px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            fontSize: '0.9rem',
                            background: song.rank <= 3
                                ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.05), transparent)'
                                : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        className="hover:bg-white/5"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: song.rank <= 3
                                    ? 'var(--primary-color)'
                                    : 'rgba(255,255,255,0.1)',
                                color: song.rank <= 3
                                    ? '#000'
                                    : '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                flexShrink: 0
                            }}>
                                {song.rank}
                            </div>
                            <div style={{ fontWeight: '500', color: song.rank <= 3 ? '#fff' : '#cbd5e1' }}>
                                {song.title}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div>
                                <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{song.count}</span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '2px' }}>回</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                演奏率 {song.percentage}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showButton && (
                <button
                    onClick={() => {
                        if (viewMode === 0) {
                            // If total <= 20, go fully open immediately? 
                            // User specifically asked for "Show More" -> then "Show All". 
                            // But if total is small, intermediate step is redundant.
                            // However, let's stick to logic: 0 -> 1 -> 2 -> 0.
                            // Ensure we don't go to 1 if 1 covers everything? No, let's just step.
                            // Better UX: if total <= 20, 0 -> 2 (Full).
                            if (totalSongs <= 20) setViewMode(2);
                            else setViewMode(1);
                        } else if (viewMode === 1) {
                            setViewMode(2);
                        } else {
                            setViewMode(0);
                        }
                    }}
                    style={{
                        width: '100%',
                        padding: '12px',
                        marginTop: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.color = '#94a3b8';
                    }}
                >
                    {viewMode === 2 ? (
                        <>
                            閉じる <ChevronUp size={14} />
                        </>
                    ) : (
                        <>
                            {viewMode === 0 ? 'もっと見る' : '全部表示する'}
                            {viewMode === 0 ? <ChevronDown size={14} /> : <ChevronsDown size={14} />}
                        </>
                    )}
                </button>
            )}

            {/* Song Detail Modal */}
            {selectedSong && (
                <div
                    onClick={() => setSelectedSong(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--card-bg)',
                            width: '90%',
                            maxWidth: '500px',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '85vh'
                        }}
                    >
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                                    演奏履歴
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-color)' }}>
                                    {selectedSong.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedSong(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    color: '#fff',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: '0', overflowY: 'auto' }}>
                            <div style={{
                                padding: '15px 20px',
                                background: 'rgba(56, 189, 248, 0.1)',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.9rem'
                            }}>
                                <span>総演奏回数: <b>{selectedSong.count}</b></span>
                                <span>演奏率: <b>{selectedSong.percentage}%</b></span>
                            </div>

                            {selectedSong.lives && selectedSong.lives.map((live, idx) => (
                                <Link
                                    to={`/live/${live.id}`}
                                    state={{ from: location.pathname }}
                                    key={idx}
                                    onClick={() => setSelectedSong(null)}
                                    style={{
                                        display: 'block',
                                        padding: '15px 20px',
                                        textDecoration: 'none',
                                        color: '#cbd5e1',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        transition: 'background 0.2s',
                                        display: 'flex',
                                        gap: '15px'
                                    }}
                                    className="hover:bg-white/5"
                                >
                                    <div style={{
                                        color: '#94a3b8',
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        minWidth: '85px'
                                    }}>
                                        {live.date}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: '#fff', fontWeight: '500', marginBottom: '2px' }}>
                                            {live.venue}
                                        </div>
                                        {live.title && (
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                {live.title}
                                            </div>
                                        )}
                                    </div>
                                    <ArrowRight size={16} color="#475569" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
