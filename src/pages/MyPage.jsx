import React, { useState, useEffect } from 'react';
import PageHeader from '../components/Layout/PageHeader';
import { Link, useLocation } from 'react-router-dom';
import { useLiveStats } from '../hooks/useLiveStats';
import LiveGraph from '../components/Dashboard/LiveGraph';
import VenueTypePie from '../components/Dashboard/VenueTypePie';
import AlbumDistribution from '../components/Dashboard/AlbumDistribution';
import SongRanking from '../components/Dashboard/SongRanking';
import MyPageOnboarding from '../components/Dashboard/MyPageOnboarding';
import { Music, Calendar, MapPin, Filter, Building2, User, Settings as SettingsIcon, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';

import AttendedLiveList from '../components/Dashboard/AttendedLiveList';
import VenueRanking from '../components/Dashboard/VenueRanking';

function MyPage() {
    const [modalFilter, setModalFilter] = useState(null);
    const location = useLocation();
    const [yearRange, setYearRange] = useState([2005, 2024]);
    const [selectedSong, setSelectedSong] = useState(null);

    const { loading, ...stats } = useLiveStats();
    const { currentUser } = useAuth();

    const [yearFilterMode, setYearFilterMode] = useState('ALL'); // 'ALL', '5', '10'

    // Set default year range based on data
    useEffect(() => {
        if (!loading && stats.myLives.length > 0 && yearFilterMode === 'ALL') {
            const years = stats.myLives.map(live => new Date(live.date || live.attended_at).getFullYear());
            const minYear = Math.min(...years);
            const currentYear = new Date().getFullYear();
            setYearRange([minYear, currentYear]);
        }

        // Safety reset on unmount
        return () => setModalFilter(null);
    }, [loading, stats.myLives, yearFilterMode]);

    const handleYearFilterChange = (e) => {
        const mode = e.target.value;
        setYearFilterMode(mode);
        const currentYear = new Date().getFullYear();
        if (mode === '5') {
            setYearRange([currentYear - 4, currentYear]);
        } else if (mode === '10') {
            setYearRange([currentYear - 9, currentYear]);
        } else {
            // ALL (handled by useEffect or immediate calculation)
            if (stats.myLives.length > 0) {
                const years = stats.myLives.map(live => new Date(live.date || live.attended_at).getFullYear());
                setYearRange([Math.min(...years), currentYear]);
            }
        }
    };


    const handleYearClick = (data) => {
        const year = data.year || data; // Handle object or direct value
        setModalFilter({ type: 'year', value: String(year) });
    };

    const handleAlbumClick = (data) => {
        if (data && data.name) {
            setModalFilter({ type: 'album', value: data.name });
        }
    };

    const handleVenueTypeClick = (venueType) => {
        setModalFilter({ type: 'venueType', value: venueType });
    };

    const handleVenueClick = (venueName) => {
        setModalFilter({ type: 'venue', value: venueName });
    };

    const handleTotalLivesClick = () => {
        setModalFilter({ type: 'allLives', value: '通算参戦履歴' });
    };

    const handleCollectedSongsClick = () => {
        setModalFilter({ type: 'collectedSongs', value: '収集した楽曲リスト' });
    };

    const handleSongClick = (song) => {
        setSelectedSong(song);
    };

    const handleBackToSongs = () => {
        setSelectedSong(null);
    };

    const closeModal = () => {
        setModalFilter(null);
        setSelectedSong(null);
    };

    const getFilteredLives = () => {
        if (!modalFilter) return [];
        let filtered = [];

        if (modalFilter.type === 'year') {
            filtered = stats.myLives.filter(live => {
                const d = live.date || live.attended_at;
                if (!d) return false;
                const year = new Date(d).getFullYear();
                return year == modalFilter.value;
            });
        } else if (modalFilter.type === 'venueType') {
            filtered = stats.myLives.filter(live => live.type === modalFilter.value);
        } else if (modalFilter.type === 'venue') {
            filtered = stats.myLives.filter(live => live.venue === modalFilter.value);
        } else if (modalFilter.type === 'allLives') {
            filtered = stats.myLives;
        }

        return filtered.sort((a, b) => {
            const dateA = new Date(a.date || a.attended_at);
            const dateB = new Date(b.date || b.attended_at);
            return dateB - dateA;
        });
    };

    const getFilteredSongs = () => {
        if (!modalFilter) return [];
        if (modalFilter.type === 'collectedSongs') return stats.songRanking;
        if (modalFilter.type === 'album') {
            return stats.songRanking.filter(song => song.album === modalFilter.value);
        }
        return [];
    };

    if (loading) return (
        <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
            <p style={{ color: '#888' }}>Loading your records...</p>
        </div>
    );

    const filteredYearlyStats = (stats.yearlyStats || []).filter(
        d => d.year >= yearRange[0] && d.year <= yearRange[1]
    );

    return (
        <div className="container" style={{ paddingTop: '100px' }}>
            <SEO title="My Page" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <Link to="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    &larr; <span style={{ fontSize: '0.9rem' }}>ダッシュボードに戻る</span>
                </Link>
                <Link to="/settings" className="edit-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SettingsIcon size={16} /> アカウント設定
                </Link>
            </div>
            <PageHeader title="MY PAGE" />

            <div className="profile-header-section" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                marginBottom: '40px',
                background: 'linear-gradient(145deg, rgba(51, 65, 85, 0.6) 0%, rgba(30, 41, 59, 0.8) 100%)',
                padding: '25px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
            }}>
                <div className="profile-avatar" style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-color) 0%, #b8860b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    color: '#000',
                    fontWeight: '900',
                    flexShrink: 0,
                    boxShadow: '0 0 30px rgba(251, 191, 36, 0.15)',
                    border: '4px solid rgba(255, 255, 255, 0.05)'
                }}>
                    {currentUser?.username?.charAt(0).toUpperCase() || <User size={40} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {currentUser?.username ? `${currentUser.username}'s` : 'My'}{' '}
                        <span className="text-gold" style={{ textShadow: '0 0 15px rgba(251, 191, 36, 0.2)' }}>UVER</span> Records
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                        {currentUser?.role === 'admin' && (
                            <span style={{
                                fontSize: '0.75rem',
                                background: 'rgba(251, 191, 36, 0.1)',
                                color: 'var(--primary-color)',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                border: '1px solid rgba(251, 191, 36, 0.2)',
                                fontWeight: '700',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}>
                                🛡️ Administrator
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {stats.totalLives > 0 ? (
                <>
                    {/* Summary Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '30px',
                        marginBottom: '40px'
                    }}>
                        <div className="stat-card" onClick={handleTotalLivesClick} style={{ cursor: 'pointer' }}>
                            <div className="stat-icon"><Calendar size={24} /></div>
                            <div className="stat-label">通算参戦数</div>
                            <div className="stat-value">{stats.totalLives}</div>
                        </div>
                        <div className="stat-card" onClick={handleCollectedSongsClick} style={{ cursor: 'pointer' }}>
                            <div className="stat-icon"><Music size={24} /></div>
                            <div className="stat-label">収集した楽曲数</div>
                            <div className="stat-value">{stats.uniqueSongs}</div>
                        </div>
                        {stats.firstLive && (
                            <Link to={`/live/${stats.firstLive.id}`} state={{ from: location.pathname }} className="stat-card group" style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)', borderColor: '#d4af37', textDecoration: 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div className="stat-icon" style={{ color: '#d4af37', marginBottom: '5px' }}><MapPin size={24} /></div>
                                        <div className="stat-label" style={{ color: '#d4af37', letterSpacing: '0.05em' }}>FIRST MEMORY / 初参戦</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '15px' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '5px' }}>
                                        {new Date(stats.firstLive.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', lineHeight: 1.3 }}>
                                        {stats.firstLive.tour_name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#d4af37', fontSize: '1rem', marginTop: '10px' }}>
                                        <Building2 size={16} />
                                        <span>{stats.firstLive.venue}</span>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Yearly Attendance Graph */}
                    <div className="dashboard-panel" style={{ marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>年間参戦履歴</h3>
                            <select
                                value={yearFilterMode}
                                onChange={handleYearFilterChange}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="ALL" style={{ backgroundColor: '#1e293b', color: 'white' }}>全期間</option>
                                <option value="5" style={{ backgroundColor: '#1e293b', color: 'white' }}>直近5年</option>
                                <option value="10" style={{ backgroundColor: '#1e293b', color: 'white' }}>直近10年</option>
                            </select>
                        </div>
                        <LiveGraph data={filteredYearlyStats} onBarClick={handleYearClick} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '50px' }}>
                        <div className="dashboard-panel chart-panel">
                            <h3>参戦会場ランキング</h3>
                            <VenueRanking venues={stats.venueRanking} onVenueClick={handleVenueClick} />
                        </div>
                        <div className="dashboard-panel chart-panel">
                            <h3>よく聴く曲</h3>
                            <SongRanking songs={stats.songRanking} />
                        </div>
                        <div className="dashboard-panel chart-panel" style={{ gridColumn: '1 / -1' }}>
                            <h3>アルバム別</h3>
                            <AlbumDistribution data={stats.albumStats} onBarClick={handleAlbumClick} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <AttendedLiveList lives={stats.myLives} />
                        </div>
                    </div>
                </>
            ) : (
                <MyPageOnboarding />
            )
            }

            {/* Filter Modal */}
            {
                modalFilter && (
                    <div onClick={closeModal} className="modal-overlay">
                        <div onClick={(e) => e.stopPropagation()} className="modal-content">
                            <div className="modal-header">
                                <h2 style={{ margin: 0 }}>
                                    {modalFilter.type === 'year' ? `${modalFilter.value} 年のライブ` :
                                        modalFilter.type === 'venueType' ? `${modalFilter.value} 会場` :
                                            modalFilter.type === 'venue' ? `${modalFilter.value}` :
                                                modalFilter.type === 'album' ? `${modalFilter.value} の収録曲` :
                                                    modalFilter.value}
                                </h2>
                                <button onClick={closeModal} className="close-modal-btn">×</button>
                            </div>

                            {modalFilter.type === 'collectedSongs' || modalFilter.type === 'album' ? (
                                selectedSong ? (
                                    <>
                                        <button onClick={handleBackToSongs} className="back-btn" style={{ marginBottom: '15px', background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
                                            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> リストに戻る
                                        </button>
                                        <div style={{ marginBottom: '20px' }}>
                                            <h3 style={{ margin: '0 0 15px 0', borderLeft: '4px solid var(--primary-color)', paddingLeft: '10px' }}>{selectedSong.title}</h3>
                                            <div className="live-list-compact">
                                                {selectedSong.lives.map((live) => {
                                                    const d = new Date(live.date);
                                                    return (
                                                        <Link
                                                            key={live.id}
                                                            to={`/live/${live.id}`}
                                                            state={{ from: location.pathname }}
                                                            className="modal-live-item"
                                                            onClick={closeModal}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'baseline',
                                                                gap: '12px',
                                                                padding: '12px 10px',
                                                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                                textDecoration: 'none',
                                                                color: 'var(--text-color)'
                                                            }}
                                                        >
                                                            <div style={{
                                                                fontSize: '0.9rem',
                                                                color: 'var(--primary-color)',
                                                                fontWeight: 'bold',
                                                                fontFamily: 'monospace',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {d.getFullYear()}.{String(d.getMonth() + 1).padStart(2, '0')}.{String(d.getDate()).padStart(2, '0')}
                                                            </div>
                                                            <div style={{ flex: 1, fontSize: '0.95rem', lineHeight: 1.4 }}>
                                                                <span style={{ fontWeight: 'bold', marginRight: '8px', color: 'white' }}>
                                                                    {live.tour_name || live.tourTitle || live.title}
                                                                </span>
                                                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                                    @ {live.venue}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="live-list-compact">
                                        {getFilteredSongs().map((song, index) => (
                                            <div
                                                key={song.title}
                                                className="modal-live-item"
                                                onClick={() => handleSongClick(song)}
                                                style={{
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: '15px',
                                                    padding: '10px 15px',
                                                    marginBottom: '6px',
                                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                                    borderRadius: '8px',
                                                    background: 'rgba(255, 255, 255, 0.03)'
                                                }}
                                            >
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    backgroundColor: index < 3 ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                                                    color: index < 3 ? '#000' : '#888',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    flexShrink: 0
                                                }}>
                                                    {index + 1}
                                                </div>
                                                <div style={{ flex: 1, fontWeight: '700', fontSize: '1rem', textAlign: 'left', color: 'var(--text-color)' }}>
                                                    {song.title}
                                                </div>
                                                <div style={{
                                                    background: 'rgba(255,255,255,0.1)',
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.8rem',
                                                    color: 'var(--primary-color)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {song.count}回
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="live-list-compact">
                                    {getFilteredLives().map((live) => {
                                        const d = new Date(live.date || live.attended_at);
                                        return (
                                            <Link
                                                key={live.id}
                                                to={`/live/${live.id}`}
                                                state={{ from: location.pathname }}
                                                className="modal-live-item"
                                                onClick={closeModal}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'baseline',
                                                    gap: '12px',
                                                    padding: '12px 10px',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                    textDecoration: 'none',
                                                    color: 'var(--text-color)'
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: '0.9rem',
                                                    color: 'var(--primary-color)',
                                                    fontWeight: 'bold',
                                                    fontFamily: 'monospace',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {d.getFullYear()}.{String(d.getMonth() + 1).padStart(2, '0')}.{String(d.getDate()).padStart(2, '0')}
                                                </div>
                                                <div style={{ flex: 1, fontSize: '0.95rem', lineHeight: 1.4 }}>
                                                    <span style={{ fontWeight: 'bold', marginRight: '8px', color: 'white' }}>
                                                        {live.tour_name || live.title}
                                                    </span>
                                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                        @ {live.venue}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            <style>{`
                .edit-btn {
                    background: none;
                    border: 1px solid #444;
                    color: #94a3b8;
                    padding: 6px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                }
                .edit-btn:hover {
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                    background: rgba(212, 175, 55, 0.05);
                }
                .profile-header-section {
                    transition: all 0.3s ease;
                }
                .stat-card {
                    background: var(--card-bg);
                    padding: 25px;
                    border-radius: 16px;
                    border: 1px solid var(--border-color);
                    position: relative;
                    overflow: hidden;
                    transition: transform 0.2s;
                }
                .stat-card:hover { transform: translateY(-2px); }
                .stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; width: 4px; height: 100%;
                    background: var(--primary-color);
                }
                .stat-icon { color: var(--primary-color); margin-bottom: 10px; }
                .stat-label { color: #94a3b8; font-size: 0.9rem; margin-bottom: 5px; }
                .stat-value { font-size: 2.5rem; font-weight: 800; color: var(--text-color); line-height: 1; }
                
                .dashboard-panel {
                    background: var(--card-bg);
                    padding: 25px;
                    border-radius: 16px;
                    border: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                }
                .chart-panel {
                    height: 400px;
                }
                .chart-panel h3 {
                    margin-bottom: 20px;
                    flex-shrink: 0;
                }
                .text-gold { color: var(--primary-color); }

                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.85); display: flex; align-items: center;
                    justify-content: center; z-index: 1000; backdrop-filter: blur(4px);
                }
                .modal-content {
                    background: var(--bg-color); border-radius: 16px; padding: 40px;
                    max-width: 600px; width: 90%; max-height: 85vh; overflow-y: auto;
                    border: 1px solid var(--border-color);
                }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                .close-modal-btn { background: none; border: none; color: #64748b; font-size: 2rem; cursor: pointer; }
                
                .modal-live-item {
                    display: flex; flex-direction: column; gap: 4px; padding: 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.05); color: inherit; text-decoration: none;
                }
                .modal-live-item:hover { background: rgba(255,255,255,0.03); }
                .back-btn { background: none; border: none; color: var(--primary-color); cursor: pointer; padding: 0; margin-bottom: 20px; }

                @media (max-width: 640px) {
                    .profile-header-section { flex-direction: column; text-align: center; gap: 20px; }
                    .profile-header-section div { justify-content: center; }
                }
            `}</style>
        </div >
    );
}

export default MyPage;
