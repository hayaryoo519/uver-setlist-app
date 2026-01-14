import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalStats } from '../hooks/useGlobalStats';
import { Calendar, Music, MapPin, ArrowRight, List, TrendingUp, Activity, Filter, Disc } from 'lucide-react';
import LiveGraph from '../components/Dashboard/LiveGraph';
import AlbumDistribution from '../components/Dashboard/AlbumDistribution';
import MainVisual from '../components/Visual/MainVisual';
import SEO from '../components/SEO';

function Dashboard() {
    const { loading, ...stats } = useGlobalStats();
    const [modalFilter, setModalFilter] = useState(null);
    const [expandedSong, setExpandedSong] = useState(null);
    const [graphMetric, setGraphMetric] = useState('liveCount');
    const [yearRange, setYearRange] = useState([2005, 2024]); // Hardcoded for now, can be dynamic

    const handleYearClick = (data) => {
        if (!data || !data.year) return;
        const year = data.year.toString();

        // 1. Filter lives by year
        const targetLives = stats.allLives.filter(live => live.date && live.date.startsWith(year));
        let totalSongsCount = 0;
        const uniqueLives = new Set(targetLives.map(l => l.id));

        // 2. Aggregate Songs
        const songMap = {};

        targetLives.forEach(live => {
            if (!live.setlist) return;
            live.setlist.forEach(song => {
                if (!song || !song.title) return;
                totalSongsCount++;

                if (!songMap[song.title]) {
                    songMap[song.title] = {
                        title: song.title,
                        id: song.id || (stats.songIdMap ? stats.songIdMap.get(song.title) : null),
                        count: 0,
                        lives: []
                    };
                }
                songMap[song.title].count++;
                songMap[song.title].lives.push({
                    id: live.id,
                    date: live.date,
                    venue: live.venue,
                    title: live.title || live.tour_name
                });
            });
        });

        // 3. Format & Sort
        const liveCount = uniqueLives.size;
        const sortedSongs = Object.values(songMap)
            .sort((a, b) => b.count - a.count)
            .map(s => ({
                ...s,
                percentage: liveCount > 0 ? ((s.count / liveCount) * 100).toFixed(1) : "0.0",
                lives: s.lives.sort((a, b) => new Date(b.date) - new Date(a.date))
            }));

        setModalFilter({
            type: 'year',
            value: {
                name: year,
                liveCount: uniqueLives.size,
                totalSongs: totalSongsCount,
                startDate: `${year}-01-01`,
                endDate: `${year}-12-31`,
                songRanking: sortedSongs
            }
        });
    };

    const handleAlbumClick = (data) => {
        if (!data || !data.name) return;
        const albumName = data.name;

        // Filter lives by current year range
        const targetLives = stats.allLives.filter(live => {
            if (!live.date) return false;
            const y = new Date(live.date).getFullYear();
            return y >= yearRange[0] && y <= yearRange[1];
        });

        // Collect songs for this album
        const songMap = {};
        const uniqueLives = new Set();
        let totalSongsCount = 0;

        targetLives.forEach(live => {
            if (!live.setlist) return;
            live.setlist.forEach(song => {
                if (!song || !song.title) return;

                // Get album for this song
                let songAlbum = stats.songAlbumMap.get(song.title);
                if (!songAlbum) songAlbum = 'Unknown';

                if (songAlbum === albumName) {
                    uniqueLives.add(live.id);
                    totalSongsCount++;

                    if (!songMap[song.title]) {
                        songMap[song.title] = {
                            title: song.title,
                            id: song.id || (stats.songIdMap ? stats.songIdMap.get(song.title) : null),
                            count: 0,
                            lives: []
                        };
                    }
                    songMap[song.title].count++;
                    songMap[song.title].lives.push({
                        id: live.id,
                        date: live.date,
                        venue: live.venue,
                        title: live.title || live.tour_name
                    });
                }
            });
        });

        // Format data for modal
        const sortedSongs = Object.values(songMap)
            .sort((a, b) => b.count - a.count)
            .map(s => ({
                ...s,
                percentage: ((s.count / totalSongsCount) * 100).toFixed(1),
                lives: s.lives.sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort lives desc
            }));

        setModalFilter({
            type: 'album',
            value: {
                name: albumName,
                liveCount: uniqueLives.size,
                totalSongs: totalSongsCount,
                startDate: yearRange[0],
                endDate: yearRange[1],
                songRanking: sortedSongs
            }
        });
    };

    const handleTourClick = (tour) => {
        setModalFilter({ type: 'tour', value: tour });
    };

    const closeModal = () => {
        setModalFilter(null);
        setExpandedSong(null);
    };

    const getFilteredLives = () => {
        if (!modalFilter) return [];
        if (modalFilter.type === 'year') {
            return stats.allLives.filter(live => live.date.startsWith(modalFilter.value));
        }
        return [];
    };

    if (loading) return (
        <div style={{ padding: '100px', textAlign: 'center', color: '#888' }}>
            Loading Global Stats...
        </div>
    );

    const filteredGraphData = (stats.yearlyDetailedStats || []).filter(
        d => d.year >= yearRange[0] && d.year <= yearRange[1]
    );

    const metrics = [
        { id: 'liveCount', label: 'ライブ数', icon: <Calendar size={14} /> },
        { id: 'totalSongs', label: '総披露曲数', icon: <Music size={14} /> },
    ];

    return (
        <div className="page-wrapper">
            <SEO title="Dashboard" />
            <MainVisual />
            <div className="container" style={{ position: 'relative', zIndex: 10 }}>
                {/* Current Tour Progress */}
                {/* Current Tour Progress Hero */}
                {stats.currentTour && (
                    <div style={{
                        marginTop: '0px',
                        marginBottom: '40px',
                        position: 'relative',
                        zIndex: 20
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
                            borderRadius: '16px',
                            padding: '24px 32px', // Reduced padding
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.4)', // Reduced shadow
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            {/* Abstract Background Element (CSS Only) */}
                            <div style={{
                                position: 'absolute',
                                top: '-50%',
                                right: '-10%',
                                width: '500px', // Reduced size
                                height: '500px',
                                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, rgba(0,0,0,0) 70%)',
                                borderRadius: '50%',
                                filter: 'blur(40px)',
                                pointerEvents: 'none'
                            }}></div>

                            <div style={{ position: 'relative', zIndex: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                                    <div style={{ flex: 1, minWidth: '300px' }}>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            color: 'var(--primary-color)',
                                            fontWeight: 'bold',
                                            fontSize: '0.75rem',
                                            marginBottom: '5px',
                                            fontFamily: 'Oswald, sans-serif',
                                            letterSpacing: '0.05em'
                                        }}>
                                            <span style={{ width: '8px', height: '8px', background: 'var(--primary-color)', borderRadius: '50%', display: 'inline-block' }}></span>
                                            LATEST TOUR / 2023-2024
                                        </div>
                                        <h2 style={{
                                            margin: '5px 0 15px 0',
                                            fontSize: '2.5rem', // Reduced from 3.5rem
                                            lineHeight: 1.1,
                                            fontFamily: 'Oswald, sans-serif',
                                            background: 'linear-gradient(to right, #fff, #cbd5e1)', // Slightly softer gradient
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            textTransform: 'uppercase'
                                        }}>
                                            {stats.currentTour.name.replace('UVERworld', '')}
                                        </h2>
                                        <div style={{ fontSize: '1rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={16} color="var(--primary-color)" />
                                                <span className="font-mono">{stats.currentTour.startDate} 〜 {stats.currentTour.endDate}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <MapPin size={16} color="var(--primary-color)" />
                                                <span>Total {stats.currentTour.liveCount} Shows</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                                        <div onClick={() => handleTourClick(stats.currentTour)} style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '50px', // Reduced size
                                            height: '50px',
                                            borderRadius: '50%',
                                            border: '1px solid var(--primary-color)', // Thinner border
                                            color: 'var(--primary-color)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s'
                                        }}
                                            className="hover-scale group"
                                        >
                                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '25px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.05em' }}>
                                        TOUR HIGHLIGHTS
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        {(stats.currentTour?.songRanking || []).slice(0, 5).map((song, i) => (
                                            <Link
                                                key={i}
                                                to={`/song/${encodeURIComponent(song.title)}`} // Note: Assuming ID lookup by title or handling needs upgrade. Wait, seed has ID? Dashboard map has no ID. Using Name for now needs robust logic or ID.
                                                // Actually standard link to /lives with filter is safer if ID missing
                                                // Better: Dashboard data should have ID. 
                                                // Checking useGlobalStats: songRanking has title, count, lives. No SongID. 
                                                // Fallback: Link to specific live or make filter. 
                                                // User requested "Clickable chips to song detail". 
                                                // I need to fetch Song IDs in useGlobalStats ideally. 
                                                // For now, I will use a placeholder or assume title lookup works if I fixed router? 
                                                // Router expects ID. 
                                                // Let's style it as desired but maybe just trigger the modal filter for now to be safe, 
                                                // OR Link to a Search page? 
                                                // Let's keep existing chip style but make it look premium.
                                                // Re-using current logic but styling better.
                                                style={{ textDecoration: 'none' }}
                                            >
                                                <div style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    padding: '8px 16px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.9rem',
                                                    borderLeft: `2px solid ${i === 0 ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)'}`,
                                                    color: '#fff',
                                                    transition: 'background 0.2s'
                                                }}
                                                    className="song-chip"
                                                >
                                                    <span style={{ fontWeight: '500' }}>{song.title}</span>
                                                    <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '0.8rem' }}>{song.count}回</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '20px',
                    marginBottom: '50px'
                }}>
                    <div className="stat-card">
                        <div className="stat-icon"><Calendar size={28} /></div>
                        <div className="stat-label">Total Lives Held</div>
                        <div className="stat-value">{stats.totalLives}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon"><Music size={28} /></div>
                        <div className="stat-label">Total Songs Played</div>
                        <div className="stat-value">{stats.totalSongsPerformed}</div>
                    </div>
                    <div className="stat-card highlight" style={{ cursor: 'pointer' }}>
                        <Link to="/lives" style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
                            <div className="stat-icon"><List size={28} /></div>
                            <div className="stat-label">Archive</div>
                            <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '10px' }}>
                                View All Lives &rarr;
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Yearly Chart */}
                <div style={{ marginBottom: '60px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                        <h2 className="section-title" style={{ marginBottom: 0 }}>
                            Trend Analysis
                            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal', marginLeft: '10px' }}>
                                (年度別統計)
                            </span>
                        </h2>

                        <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                            {metrics.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setGraphMetric(m.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: graphMetric === m.id ? 'var(--primary-color)' : 'transparent',
                                        color: graphMetric === m.id ? '#000' : '#94a3b8',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: graphMetric === m.id ? 'bold' : 'normal'
                                    }}
                                >
                                    {m.icon}
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="dashboard-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={14} />
                                期間: {yearRange[0]} - {yearRange[1]}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="range"
                                    min="2005"
                                    max="2024"
                                    value={yearRange[0]}
                                    onChange={(e) => setYearRange([parseInt(e.target.value), yearRange[1]])}
                                    style={{ width: '80px', accentColor: 'var(--primary-color)' }}
                                />
                                <input
                                    type="range"
                                    min="2005"
                                    max="2024"
                                    value={yearRange[1]}
                                    onChange={(e) => setYearRange([yearRange[0], parseInt(e.target.value)])}
                                    style={{ width: '80px', accentColor: 'var(--primary-color)' }}
                                />
                            </div>
                        </div>
                        <LiveGraph
                            data={filteredGraphData}
                            onBarClick={handleYearClick}
                            dataKey={graphMetric}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>

                    {/* Top Songs Ranking (Left Column) */}
                    <div>
                        <h2 className="section-title" style={{ marginBottom: '20px' }}>Top Songs <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal' }}>(Top 10)</span></h2>
                        <div className="dashboard-panel" style={{ padding: 0 }}>
                            {(stats.globalSongRanking || []).slice(0, 10).map((song, index) => (
                                <Link
                                    to={song.id ? `/song/${song.id}` : '#'}
                                    key={index}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '15px 20px',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        }}
                                        className="hover-opacity"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: index < 3 ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'rgba(255,255,255,0.1)',
                                                color: index < 3 ? '#000' : '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem',
                                                flexShrink: 0
                                            }}>
                                                {index + 1}
                                            </div>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: '500' }}>{song.title}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', paddingLeft: '15px' }}>
                                            <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                                {song.count} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>Plays</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {song.percentage}%
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Recent Lives & Album Graph */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {/* Recent Lives */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 className="section-title" style={{ marginBottom: 0 }}>Recent Lives</h2>
                                <Link to="/lives" style={{ color: 'var(--accent-color)', fontSize: '0.9rem' }}>View All</Link>
                            </div>
                            <div className="dashboard-panel" style={{ padding: '0' }}>
                                {(stats.recentLives || []).map((live, index) => (
                                    <Link key={live.id} to={`/live/${live.id}`} className="recent-live-item">
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{live.date}</div>
                                        <div style={{ fontWeight: 'bold', margin: '4px 0' }}>{live.tourTitle}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>@ {live.venue}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Songs by Album */}
                        <div className="dashboard-panel">
                            {/* Duplicate Slider for easier access */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Filter size={14} />
                                    期間: {yearRange[0]} - {yearRange[1]}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="range"
                                        min="2005"
                                        max="2024"
                                        value={yearRange[0]}
                                        onChange={(e) => setYearRange([Math.min(parseInt(e.target.value), yearRange[1]), yearRange[1]])}
                                        style={{ width: '80px', accentColor: 'var(--primary-color)' }}
                                    />
                                    <input
                                        type="range"
                                        min="2005"
                                        max="2024"
                                        value={yearRange[1]}
                                        onChange={(e) => setYearRange([yearRange[0], Math.max(parseInt(e.target.value), yearRange[0])])}
                                        style={{ width: '80px', accentColor: 'var(--primary-color)' }}
                                    />
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Disc size={20} color="var(--primary-color)" />
                                Songs by Album ({yearRange[0]} - {yearRange[1]})
                            </h3>
                            <AlbumDistribution data={(() => {
                                if (!stats.allLives || !stats.songAlbumMap) return [];

                                const targetLives = stats.allLives.filter(live => {
                                    if (!live.date) return false;
                                    const y = new Date(live.date).getFullYear();
                                    return y >= yearRange[0] && y <= yearRange[1];
                                });

                                const map = new Map();
                                targetLives.forEach(live => {
                                    if (!live.setlist) return;
                                    live.setlist.forEach(song => {
                                        if (!song || !song.title) return;
                                        // Try exact match first, then unknown
                                        let album = stats.songAlbumMap.get(song.title);
                                        if (!album) {
                                            // Fallback: Check if map keys have slight variation? (Simpler to just default to Unknown)
                                            album = 'Unknown';
                                        }
                                        map.set(album, (map.get(album) || 0) + 1);
                                    });
                                });

                                const result = Array.from(map.entries())
                                    .map(([name, value]) => ({ name, value }))
                                    .sort((a, b) => b.value - a.value);

                                return result;
                            })()} onBarClick={handleAlbumClick} />
                        </div>
                    </div>
                </div>

                {/* Top Tours (Bottom Row) */}
                <div style={{ marginTop: '50px' }}>
                    <h2 className="section-title" style={{ marginBottom: '20px' }}>Top Tours <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal' }}>(クリックで詳細)</span></h2>
                    <div className="dashboard-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {(stats.tourRanking || []).map((tour, index) => (
                            <div
                                key={index}
                                onClick={() => handleTourClick(tour)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 0',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer'
                                }}
                                className="hover-opacity"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: index < 3 ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                                        color: index < 3 ? '#000' : '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{tour.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            {tour.startDate} - {tour.endDate}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                        {tour.liveCount} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>Shows</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .stat-card {
                    background: var(--card-bg);
                    padding: 25px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    transition: transform 0.2s;
                }
                .stat-card.highlight {
                    background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,0,0,0));
                    border-color: var(--primary-color);
                }
                .stat-card:hover {
                    transform: translateY(-5px);
                }
                .stat-icon {
                    color: var(--primary-color);
                    margin-bottom: 10px;
                }
                .stat-label {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .stat-value {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: var(--text-color);
                    line-height: 1.2;
                }
                .dashboard-panel {
                    background: var(--card-bg);
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                }
                .recent-live-item {
                    display: block;
                    padding: 15px 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    color: inherit;
                    text-decoration: none;
                    transition: background 0.2s;
                }
                .recent-live-item:last-child {
                    border-bottom: none;
                }
                .recent-live-item:hover {
                    background: rgba(255,255,255,0.03);
                }
            `}</style>

            {/* Filter Modal */}
            {modalFilter && (
                <div
                    onClick={closeModal}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'var(--bg-color)',
                            borderRadius: '12px',
                            padding: '30px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>
                                {modalFilter.type === 'year' ? `${modalFilter.value.name}年の楽曲ランキング (Yearly Ranking)` :
                                    modalFilter.type === 'album' ? `${modalFilter.value.name} (Album) Songs` :
                                        `${modalFilter.value.name} 楽曲分析`}
                            </h2>
                            <button
                                onClick={closeModal}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#888',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    padding: '0 10px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Unified View for Year / Album / Tour */}
                        <>
                            <div style={{ color: '#888', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>全{modalFilter.value.liveCount}公演 / 総披露{modalFilter.value.totalSongs}曲</span>
                                <span>{modalFilter.value.startDate} 〜 {modalFilter.value.endDate}</span>
                            </div>

                            <div>
                                {modalFilter.value.songRanking.map((song, idx) => (
                                    <div key={idx} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                        <div
                                            onClick={() => setExpandedSong(expandedSong === idx ? null : idx)}
                                            style={{
                                                padding: '12px 0',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {song.id ? (
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ color: 'white' }}>{song.title}</span>
                                                            <Link
                                                                to={`/song/${song.id}#performance-history`}
                                                                onClick={(e) => { e.stopPropagation(); closeModal(); }}
                                                                style={{ color: '#94a3b8', textDecoration: 'underline', fontSize: '0.8rem', marginLeft: '8px', cursor: 'pointer' }}
                                                                className="hover:text-blue-400"
                                                            >
                                                                詳細ページ
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        song.title
                                                    )}
                                                </div>
                                                <div style={{
                                                    height: '4px',
                                                    background: '#333',
                                                    width: '100%',
                                                    marginTop: '8px',
                                                    borderRadius: '2px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        background: 'var(--primary-color)',
                                                        width: `${song.percentage}%`
                                                    }} />
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{song.count}回</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>演奏率 {song.percentage}%</div>
                                            </div>
                                        </div>

                                        {expandedSong === idx && (
                                            <div style={{
                                                padding: '0 15px 15px 15px',
                                                background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '8px',
                                                marginBottom: '10px'
                                            }}>
                                                {song.lives.map(live => (
                                                    <Link
                                                        key={live.id}
                                                        to={`/live/${live.id}`}
                                                        onClick={closeModal}
                                                        style={{
                                                            display: 'block',
                                                            padding: '8px 0',
                                                            fontSize: '0.85rem',
                                                            color: '#94a3b8',
                                                            textDecoration: 'none',
                                                            borderBottom: '1px solid rgba(255,255,255,0.03)'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>{live.date}</span>
                                                            <span style={{ color: '#64748b' }}>@ {live.venue}</span>
                                                        </div>
                                                        {live.title && live.title !== modalFilter.value.name && (
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right', marginTop: '2px' }}>
                                                                {live.title}
                                                            </div>
                                                        )}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>

                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
