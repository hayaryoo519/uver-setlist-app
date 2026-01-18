import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserProfile, saveUserProfile } from '../utils/storage';
import { useLiveStats } from '../hooks/useLiveStats';
import LiveGraph from '../components/Dashboard/LiveGraph';
import VenueTypePie from '../components/Dashboard/VenueTypePie';
import AlbumDistribution from '../components/Dashboard/AlbumDistribution';
import SongRanking from '../components/Dashboard/SongRanking';
import MyPageOnboarding from '../components/Dashboard/MyPageOnboarding';
import { Twitter, Instagram, Youtube, Globe, Music, Calendar, MapPin, Filter, Disc, Building2 } from 'lucide-react';
import SEO from '../components/SEO';

import AttendedLiveList from '../components/Dashboard/AttendedLiveList';
import VenueRanking from '../components/Dashboard/VenueRanking';

function MyPage() {
    const [userProfile, setUserProfile] = useState({ twitter: '', instagram: '', youtube: '', website: '' });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [tempProfile, setTempProfile] = useState({});
    const [modalFilter, setModalFilter] = useState(null);
    const [yearRange, setYearRange] = useState([2005, 2024]);
    const [selectedSong, setSelectedSong] = useState(null);

    const { loading, ...stats } = useLiveStats();

    useEffect(() => {
        const savedProfile = getUserProfile();
        if (savedProfile) {
            setUserProfile(prev => ({ ...prev, ...savedProfile }));
        }
    }, []);

    // Set default year range based on data
    useEffect(() => {
        if (!loading && stats.myLives.length > 0) {
            const years = stats.myLives.map(live => new Date(live.date).getFullYear());
            const minYear = Math.min(...years);
            const currentYear = new Date().getFullYear();
            setYearRange([minYear, currentYear]);
        }
    }, [loading, stats.myLives]);

    const handleEditClick = () => {
        setTempProfile({ ...userProfile });
        setIsEditingProfile(true);
    };

    const handleSaveClick = () => {
        setUserProfile(tempProfile);
        saveUserProfile(tempProfile);
        setIsEditingProfile(false);
    };

    const handleCancelClick = () => {
        setIsEditingProfile(false);
    };

    const handleInputChange = (field, value) => {
        setTempProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleYearClick = (year) => {
        setModalFilter({ type: 'year', value: year });
    };

    const handleAlbumClick = (data) => {
        if (data && data.name) {
            setModalFilter({ type: 'album', value: data.name });
        }
    };

    const handleVenueTypeClick = (venueType) => {
        setModalFilter({ type: 'venueType', value: venueType });
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
        if (modalFilter.type === 'year') {
            return stats.myLives.filter(live => {
                // handle both DB date str and local
                const d = live.date || live.attended_at;
                return d && d.startsWith(modalFilter.value);
            });
        }
        if (modalFilter.type === 'venueType') {
            return stats.myLives.filter(live => live.type === modalFilter.value);
        }
        if (modalFilter.type === 'allLives') {
            return stats.myLives;
        }
        return [];
    };

    const getFilteredSongs = () => {
        if (!modalFilter) return [];
        if (modalFilter.type === 'collectedSongs') return stats.songRanking;
        if (modalFilter.type === 'album') {
            return stats.songRanking.filter(song => song.album === modalFilter.value);
        }
        return [];
    };

    // Loading State
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
            <Link to="/" style={{ display: 'inline-block', marginBottom: '20px', color: '#94a3b8' }}>&larr; ダッシュボードに戻る</Link>

            <h1 style={{ marginBottom: '30px', fontSize: '2.5rem' }}>My <span className="text-gold">UVER</span> Records</h1>

            {stats.totalLives > 0 ? (
                <>
                    {/* Summary Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px',
                        marginBottom: '40px'
                    }}>
                        <div className="stat-card" onClick={handleTotalLivesClick} style={{ cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}>
                            <div className="stat-icon"><Calendar size={24} /></div>
                            <div className="stat-label">通算参戦数</div>
                            <div className="stat-value">{stats.totalLives}</div>
                        </div>
                        <div className="stat-card" onClick={handleCollectedSongsClick} style={{ cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}>
                            <div className="stat-icon"><Music size={24} /></div>
                            <div className="stat-label">収集した楽曲数</div>
                            <div className="stat-value">{stats.uniqueSongs}</div>
                        </div>
                        {stats.firstLive && (
                            <Link to={`/live/${stats.firstLive.id}`} className="stat-card group" style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)', borderColor: '#d4af37', textDecoration: 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div className="stat-icon" style={{ color: '#d4af37', marginBottom: '5px' }}><MapPin size={24} /></div>
                                        <div className="stat-label" style={{ color: '#d4af37', letterSpacing: '0.05em' }}>FIRST MEMORY / 初参戦</div>
                                    </div>
                                    <div style={{ fontSize: '3rem', opacity: 0.1, fontWeight: '900', color: '#d4af37', lineHeight: 1 }}>01</div>
                                </div>

                                <div style={{ marginTop: '15px' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '5px' }}>
                                        {new Date(stats.firstLive.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', lineHeight: 1.3, marginBottom: '10px' }} className="group-hover:text-blue-400 transition-colors">
                                        {stats.firstLive.tour_name}
                                    </div>
                                    {stats.firstLive.title && stats.firstLive.title !== stats.firstLive.tour_name && (
                                        <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '10px' }}>
                                            {stats.firstLive.title}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#d4af37', fontSize: '1rem' }}>
                                        <Building2 size={16} />
                                        <span>@ {stats.firstLive.venue}</span>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Yearly Attendance Graph (Full Width) */}
                    <div className="dashboard-panel" style={{ marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3>年間参戦履歴 <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal' }}>(クリックで絞り込み)</span></h3>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
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

                        <LiveGraph data={filteredYearlyStats} onBarClick={handleYearClick} />
                    </div>

                    {/* Secondary Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '50px', gridAutoRows: '500px' }}>
                        <div className="dashboard-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ flexShrink: 0 }}>会場別データ <span style={{ fontSize: '0.8rem', color: '#888' }}>(クリックで絞り込み)</span></h3>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <VenueTypePie data={stats.venueTypeStats} onBarClick={handleVenueTypeClick} />
                            </div>
                        </div>
                        <div className="dashboard-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ flexShrink: 0 }}>参戦会場ランキング</h3>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <VenueRanking venues={stats.venueRanking} />
                            </div>
                        </div>
                        <div className="dashboard-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ flexShrink: 0 }}>よく聴く曲</h3>
                            <div style={{ flex: 1, minHeight: 0, paddingRight: '5px' }}>
                                <SongRanking songs={stats.songRanking} />
                            </div>
                        </div>
                        <div className="dashboard-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ flexShrink: 0 }}>アルバム別</h3>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <AlbumDistribution data={stats.albumStats} onBarClick={handleAlbumClick} />
                            </div>
                        </div>
                        <div style={{ gridColumn: '1 / -1', height: '100%' }}>
                            <AttendedLiveList lives={stats.myLives} />
                        </div>
                    </div>
                </>
            ) : (
                <MyPageOnboarding />
            )}

            {/* User Social Links */}
            <div className="social-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '40px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: '#888' }}>SNSリンク</h3>
                    {!isEditingProfile && (
                        <button onClick={handleEditClick} className="edit-btn">編集</button>
                    )}
                </div>

                {isEditingProfile ? (
                    <div className="edit-profile-form">
                        <div className="form-group">
                            <label><Twitter size={16} /> Twitter URL</label>
                            <input
                                type="text"
                                value={tempProfile.twitter}
                                onChange={(e) => handleInputChange('twitter', e.target.value)}
                                placeholder="https://twitter.com/..."
                            />
                        </div>
                        <div className="form-group">
                            <label><Instagram size={16} /> Instagram URL</label>
                            <input
                                type="text"
                                value={tempProfile.instagram}
                                onChange={(e) => handleInputChange('instagram', e.target.value)}
                                placeholder="https://instagram.com/..."
                            />
                        </div>
                        <div className="form-group">
                            <label><Youtube size={16} /> YouTube URL</label>
                            <input
                                type="text"
                                value={tempProfile.youtube}
                                onChange={(e) => handleInputChange('youtube', e.target.value)}
                                placeholder="https://youtube.com/..."
                            />
                        </div>
                        <div className="form-group">
                            <label><Globe size={16} /> Website/Blog</label>
                            <input
                                type="text"
                                value={tempProfile.website}
                                onChange={(e) => handleInputChange('website', e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="form-actions">
                            <button onClick={handleCancelClick} className="cancel-btn">Cancel</button>
                            <button onClick={handleSaveClick} className="save-btn">Save Profile</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '30px' }}>
                        {userProfile.twitter && (
                            <a href={userProfile.twitter} target="_blank" rel="noopener noreferrer" className="social-icon">
                                <Twitter size={30} />
                            </a>
                        )}
                        {userProfile.instagram && (
                            <a href={userProfile.instagram} target="_blank" rel="noopener noreferrer" className="social-icon">
                                <Instagram size={30} />
                            </a>
                        )}
                        {userProfile.youtube && (
                            <a href={userProfile.youtube} target="_blank" rel="noopener noreferrer" className="social-icon">
                                <Youtube size={30} />
                            </a>
                        )}
                        {userProfile.website && (
                            <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="social-icon">
                                <Globe size={30} />
                            </a>
                        )}
                        {!userProfile.twitter && !userProfile.instagram && !userProfile.youtube && !userProfile.website && (
                            <div style={{ color: '#666', fontStyle: 'italic' }}>リンクが設定されていません。「編集」から追加してください。</div>
                        )}
                    </div>
                )}
            </div>

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
                                {modalFilter.type === 'year' ? `${modalFilter.value} 年のライブ` :
                                    modalFilter.type === 'venueType' ? `${modalFilter.value} 会場` :
                                        modalFilter.type === 'album' ? `${modalFilter.value} の収録曲` :
                                            modalFilter.value}
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

                        {modalFilter.type === 'collectedSongs' || modalFilter.type === 'album' ? (
                            selectedSong ? (
                                // Drill-down: Song Detail View
                                <>
                                    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button
                                            onClick={handleBackToSongs}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--primary-color)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            &larr; リストに戻る
                                        </button>
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>{selectedSong.title}</h3>
                                        <div style={{ color: '#888' }}>
                                            全 {selectedSong.count} 回の演奏
                                        </div>
                                    </div>
                                    <div className="live-list-compact">
                                        {selectedSong.lives.map((live) => (
                                            <Link
                                                key={live.id}
                                                to={`/live/${live.id}`}
                                                className="compact-live-item"
                                                onClick={closeModal}
                                            >
                                                <div className="date">{new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '.')}</div>
                                                <div className="title">{live.tourTitle}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>@ {live.venue}</div>
                                            </Link>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                // Song List View
                                <>
                                    <div style={{ color: '#888', marginBottom: '20px' }}>
                                        {getFilteredSongs().length}曲を収集済み
                                    </div>
                                    <div className="live-list-compact">
                                        {getFilteredSongs().map((song, index) => (
                                            <div
                                                key={song.title}
                                                className="compact-live-item"
                                                onClick={() => handleSongClick(song)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{
                                                        fontSize: '1.2rem', fontWeight: 'bold', width: '30px',
                                                        color: index < 3 ? 'var(--primary-color)' : '#475569',
                                                        fontFamily: 'Oswald, sans-serif'
                                                    }}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold' }}>{song.title}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                            {index === 0 ? 'あなたのNo.1ソング！' : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontSize: '0.9rem', fontWeight: 'bold',
                                                    background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px',
                                                    display: 'flex', alignItems: 'center', gap: '5px'
                                                }}>
                                                    {song.count} 回
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )
                        ) : (
                            // Live List View
                            <>
                                <div style={{ color: '#888', marginBottom: '20px' }}>
                                    {getFilteredLives().length}件のライブ
                                </div>
                                <div className="live-list-compact">
                                    {getFilteredLives().map((live) => (
                                        <Link
                                            key={live.id}
                                            to={`/live/${live.id}`}
                                            className="compact-live-item"
                                            onClick={closeModal}
                                        >
                                            <div className="date">{new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '.')}</div>
                                            <div className="title">{live.tourTitle}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>@ {live.venue}</div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .stat-card {
                    background: var(--card-bg);
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    position: relative;
                    overflow: hidden;
                }
                .stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 4px;
                    height: 100%;
                    background: var(--primary-color);
                }
                .stat-icon {
                    color: var(--primary-color);
                    margin-bottom: 10px;
                }
                .stat-label {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    margin-bottom: 5px;
                }
                .stat-value {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: var(--text-color);
                    line-height: 1;
                }
                .dashboard-panel {
                    background: var(--card-bg);
                    padding: 25px;
                    border-radius: 16px;
                    border: 1px solid var(--border-color);
                }
                .text-gold {
                    color: var(--primary-color);
                }
                .compact-live-item {
                    display: block;
                    padding: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    color: inherit;
                    text-decoration: none;
                    transition: background 0.2s;
                }
                .compact-live-item:hover {
                    background: rgba(255, 255, 255, 0.03);
                    text-decoration: none;
                }
                .compact-live-item.date {
                    font-size: 0.8rem;
                    color: var(--accent-color);
                }
                .compact-live-item.title {
                    font-weight: 500;
                }
                .social-icon {
                    color: #fff;
                    transition: color 0.2s, transform 0.2s;
                }
                .social-icon:hover {
                    color: var(--primary-color);
                    transform: translateY(-3px);
                }
                .edit-btn {
                    background: none;
                    border: 1px solid #444;
                    color: #888;
                    padding: 2px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }
                .edit-btn:hover {
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }
                .edit-profile-form {
                    max-width: 400px;
                    margin: 0 auto;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                .form-group {
                    margin-bottom: 15px;
                    text-align: left;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    color: #ccc;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .form-group input {
                    width: 100%;
                    padding: 8px 12px;
                    background: var(--bg-color);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    color: white;
                    font-family: inherit;
                }
                .form-group input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                }
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                }
                .save-btn, .cancel-btn {
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    border: none;
                }
                .save-btn {
                    background: var(--primary-color);
                    color: black;
                }
                .cancel-btn {
                    background: #333;
                    color: white;
                }
            `}</style>
        </div>
    );
}

export default MyPage;
