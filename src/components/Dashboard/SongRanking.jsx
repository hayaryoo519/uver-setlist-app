import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SongRanking = ({ songs }) => {
    const [limit, setLimit] = useState(5);
    const [expandedSongs, setExpandedSongs] = useState(new Set());
    const [liveLimits, setLiveLimits] = useState({});

    if (!songs || songs.length === 0) return <div className="no-data">No songs collected yet.</div>;

    const displayedSongs = songs.slice(0, limit);

    const toggleExpand = (songTitle) => {
        setExpandedSongs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(songTitle)) {
                newSet.delete(songTitle);
            } else {
                newSet.add(songTitle);
                // Initialize live limit for this song
                if (!liveLimits[songTitle]) {
                    setLiveLimits(prev => ({ ...prev, [songTitle]: 10 }));
                }
            }
            return newSet;
        });
    };

    const showMoreLives = (songTitle) => {
        setLiveLimits(prev => ({
            ...prev,
            [songTitle]: (prev[songTitle] || 10) + 10
        }));
    };

    return (
        <div className="song-ranking" style={{ height: '100%', overflowY: 'auto', paddingRight: '5px' }}>
            {songs.map((song, index) => {
                const isExpanded = expandedSongs.has(song.title);
                const hasLives = song.lives && song.lives.length > 0;
                const liveLimit = liveLimits[song.title] || 10;
                const displayedLives = hasLives ? song.lives.slice(0, liveLimit) : [];
                const hasMoreLives = hasLives && song.lives.length > liveLimit;

                return (
                    <div key={song.title} style={{ marginBottom: '10px' }}>
                        <div
                            onClick={() => hasLives && toggleExpand(song.title)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                cursor: hasLives ? 'pointer' : 'default',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => hasLives && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                        >
                            <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                backgroundColor: index < 3 ? 'var(--primary-color)' : '#333',
                                color: index < 3 ? '#000' : '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                marginRight: '15px',
                                flexShrink: 0
                            }}>
                                {index + 1}
                            </div>
                            <div style={{ flexGrow: 1, fontWeight: '500', marginRight: '10px', wordBreak: 'break-all' }}>
                                {song.title}
                            </div>
                            <div style={{ color: '#fbbf24', fontWeight: 'bold', marginRight: '10px', whiteSpace: 'nowrap' }}>
                                {song.count}回
                            </div>
                            {hasLives && (
                                isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />
                            )}
                        </div>

                        {isExpanded && hasLives && (
                            <div style={{
                                marginTop: '5px',
                                marginLeft: '10px',
                                padding: '10px',
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                borderLeft: '4px solid var(--primary-color)'
                            }}>
                                {displayedLives.map((live, idx) => {
                                    const d = new Date(live.date);
                                    const dateStr = !isNaN(d.getTime())
                                        ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
                                        : live.date;

                                    return (
                                        <Link
                                            key={`${live.id}-${idx}`}
                                            to={`/live/${live.id}`}
                                            style={{
                                                display: 'block',
                                                padding: '8px 0',
                                                borderBottom: idx < displayedLives.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                                color: 'inherit',
                                                textDecoration: 'none',
                                                transition: 'all 0.2s',
                                                opacity: 0.9
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = 'var(--primary-color)';
                                                e.currentTarget.style.opacity = '1';
                                                e.currentTarget.style.paddingLeft = '5px';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = 'inherit';
                                                e.currentTarget.style.opacity = '0.9';
                                                e.currentTarget.style.paddingLeft = '0';
                                            }}
                                        >
                                            <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontFamily: 'monospace', marginBottom: '2px' }}>
                                                {dateStr}
                                            </div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: '700', lineHeight: 1.3 }}>
                                                {live.tourTitle || live.tour_name}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                                @ {live.venue}
                                            </div>
                                        </Link>
                                    );
                                })}

                                {hasMoreLives && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            showMoreLives(song.title);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            marginTop: '10px',
                                            background: 'transparent',
                                            border: '1px solid var(--border-color)',
                                            color: '#888',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        さらに表示 ({song.lives.length - liveLimit}件)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default SongRanking;
