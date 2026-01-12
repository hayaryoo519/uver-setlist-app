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
        if (data && data.year) {
            setModalFilter({ type: 'year', value: data.year });
        }
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
            <div className="container" style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>
                {/* Current Tour Progress */}
                {stats.currentTour && (
                    <div className="dashboard-panel" style={{ marginBottom: '30px', borderLeft: '4px solid var(--primary-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    Current / Latest Tour
                                </div>
                                <h2 style={{ margin: '5px 0', fontSize: '1.5rem' }}>{stats.currentTour.name}</h2>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                    <Calendar size={14} />
                                    {stats.currentTour.startDate} 〜 {stats.currentTour.endDate}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.currentTour.liveCount} 公演目</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Latest: {stats.currentTour.latestDate}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '8px' }}>Tour Standouts (よく演奏されている曲)</div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {(stats.currentTour?.songRanking || []).slice(0, 3).map((song, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {song.title} <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}>{song.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div
                            onClick={() => handleTourClick(stats.currentTour)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: 'var(--accent-color)',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            詳細分析を見る <ArrowRight size={16} />
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
                    {/* Tour Ranking */}
                    <div>
                        <h2 className="section-title">Top Tours <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal' }}>(クリックで詳細)</span></h2>
                        <div className="dashboard-panel">
                            {stats.tourRanking.map((tour, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleTourClick(tour)}
                                    style={{
                                        padding: '12px 0',
                                        borderBottom: index < stats.tourRanking.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '500' }}>{tour.name}</span>
                                        <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{tour.liveCount}公演</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>総披露曲数: {tour.totalSongs}曲</span>
                                        <span style={{ fontSize: '0.75rem' }}>{tour.startDate}〜{tour.endDate}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Lives & Album Graph */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 className="section-title" style={{ marginBottom: 0 }}>Recent Lives</h2>
                                <Link to="/lives" style={{ color: 'var(--accent-color)', fontSize: '0.9rem' }}>View All</Link>
                            </div>
                            <div className="dashboard-panel" style={{ padding: '0' }}>
                                {stats.recentLives.map((live, index) => (
                                    <Link key={live.id} to={`/live/${live.id}`} className="recent-live-item">
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{live.date}</div>
                                        <div style={{ fontWeight: 'bold', margin: '4px 0' }}>{live.tourTitle}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>@ {live.venue}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* New Album Graph Card */}
                        <div className="dashboard-panel">
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Disc size={20} color="var(--primary-color)" /> Songs by Album (All Time)
                            </h3>
                            <AlbumDistribution data={stats.albumStats || []} />
                        </div>
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
                                {modalFilter.type === 'year' ? `${modalFilter.value}年のライブ` : `${modalFilter.value.name} 楽曲分析`}
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

                        {modalFilter.type === 'year' ? (
                            <>
                                <div style={{ color: '#888', marginBottom: '20px' }}>
                                    {getFilteredLives().length}件のライブ
                                </div>
                                <div>
                                    {getFilteredLives().map((live) => (
                                        <Link
                                            key={live.id}
                                            to={`/live/${live.id}`}
                                            className="recent-live-item"
                                            onClick={closeModal}
                                        >
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{live.date}</div>
                                            <div style={{ fontWeight: '500', marginTop: '4px' }}>{live.tourTitle}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>@ {live.venue}</div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        ) : (
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
                                                        {song.title}
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
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
