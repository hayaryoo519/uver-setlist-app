import React, { useMemo, useState, useEffect } from 'react';
import PageHeader from '../components/Layout/PageHeader';
import { Link, useLocation } from 'react-router-dom';
import { DISCOGRAPHY } from '../data/discography';
import { useGlobalStats } from '../hooks/useGlobalStats';
import SEO from '../components/SEO';
import { Disc, Music, Calendar, Search, Filter, ArrowUpDown } from 'lucide-react';
// Simple normalization helper (client-side version)
const normalizeSongTitle = (title) => {
    if (!title) return "";
    return title
        .toLowerCase()
        .replace(/[!'#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, "")
        .replace(/\s+/g, "");
};

function Songs() {
    const { loading, songIdMap, allLives, songTranslationMap, error } = useGlobalStats();
    const location = useLocation();

    // Handle hash scroll on mount/location change
    useEffect(() => {
        if (location.hash) {
            const targetId = decodeURIComponent(location.hash.slice(1));
            setTimeout(() => {
                const element = document.getElementById(`release-${targetId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    element.style.animation = 'highlight-pulse 2s ease-out';
                }
            }, 100);
        }
    }, [location]);

    // Filter and Sort state
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, ALBUM, SINGLE
    const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, title-asc, title-desc

    // Helper to find song ID matching the discography title
    const getSongId = (title) => {
        if (!songIdMap) return null;

        // 1. Try exact match
        if (songIdMap.has(title)) return songIdMap.get(title);

        // 2. Try normalized (Japanese) title if 'title' is Romaji/English
        // We need the reverse lookup or the translation map
        // If we don't have the map handy, we might miss some.
        // But DISCOGRAPHY uses mostly Romaji/English or mixed. 
        // Let's rely on songIdMap having keys for what's in DB.

        return null;
    };

    // Helper to check if song has been performed (exists in DB)
    const getSongStatus = (title) => {
        if (!songIdMap) return false;
        // Check if we have an ID. If yes, check if valid.
        const id = getSongId(title);
        // Also check if we should try to Normalize using the server util logic?
        // Since we can't easily import server code in Vite without config, 
        // we'll assume the songIdMap (built from DB) contains the "Official" titles.
        // And DISCOGRAPHY should use Official titles preferably.
        // Update: DISCOGRAPHY uses translation keys mostly. 
        return !!id;
    }

    // We need to resolve titles in DISCOGRAPHY to their database equivalents
    // The songIdMap keys are the "Official" titles (Japanese usually).
    // DISCOGRAPHY has mix. 
    // We should probably rely on a client-side version of translations or just assume DISCOGRAPHY is correct.

    // Filtered and sorted discography
    const filteredDiscography = useMemo(() => {
        let result = [...DISCOGRAPHY];

        // Type filter
        if (typeFilter !== 'ALL') {
            result = result.filter(r => r.type === typeFilter);
        }

        // Search filter (search in release title and song titles)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.map(release => {
                // Check if release title matches
                const titleMatch = release.title.toLowerCase().includes(query);
                // Filter songs that match
                const matchingSongs = release.songs.filter(s => s.toLowerCase().includes(query));

                if (titleMatch) {
                    return release; // Show all songs if album title matches
                } else if (matchingSongs.length > 0) {
                    return { ...release, songs: matchingSongs }; // Show only matching songs
                }
                return null;
            }).filter(Boolean);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'title-asc':
                    return a.title.localeCompare(b.title, 'ja');
                case 'title-desc':
                    return b.title.localeCompare(a.title, 'ja');
                default:
                    return 0;
            }
        });

        return result;
    }, [typeFilter, searchQuery, sortBy]);

    return (
        <div className="page-wrapper">
            <SEO title="Discography" />

            <div className="container" style={{ paddingTop: '100px', paddingBottom: '80px' }}>
                <PageHeader
                    title="DISCOGRAPHY"
                    subtitle={`All Releases (${filteredDiscography.length} / ${DISCOGRAPHY.length})`}
                />

                {/* Filter Controls */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '30px',
                    padding: '20px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1 1 250px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="曲名・アルバム名で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 40px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    {/* Type Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} color="#64748b" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            style={{
                                padding: '10px 30px 10px 12px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="ALL">すべて</option>
                            <option value="ALBUM">アルバム</option>
                            <option value="SINGLE">シングル</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowUpDown size={16} color="#64748b" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                padding: '10px 30px 10px 12px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="date-desc">新しい順</option>
                            <option value="date-asc">古い順</option>
                            <option value="title-asc">タイトル A→Z</option>
                            <option value="title-desc">タイトル Z→A</option>
                        </select>
                    </div>
                </div>

                {error ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <h3 style={{ marginBottom: '10px' }}>Connection Error</h3>
                        <p>{error}</p>
                        <p style={{ fontSize: '0.8rem', marginTop: '10px', color: '#9ca3af' }}>Please ensure the server is running and database is connected.</p>
                    </div>
                ) : loading ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>
                        Loading Discography...
                    </div>
                ) : (
                    <div className="discography-list">
                        {filteredDiscography.map((release, index) => (
                            <div
                                key={index}
                                id={`release-${release.title}`}
                                className="release-card fade-in-up"
                                style={{
                                    marginBottom: '40px',
                                    animationDelay: `${index * 50}ms`,
                                    scrollMarginTop: '120px'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: '15px',
                                    marginBottom: '15px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    paddingBottom: '10px'
                                }}>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        color: release.type === 'ALBUM' ? 'var(--primary-color)' : '#94a3b8',
                                        border: `1px solid ${release.type === 'ALBUM' ? 'var(--primary-color)' : '#475569'}`,
                                        padding: '2px 8px',
                                        borderRadius: '4px'
                                    }}>
                                        {release.type}
                                    </div>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        margin: 0,
                                        fontFamily: 'Oswald, sans-serif'
                                    }}>
                                        {release.title}
                                    </h2>
                                    <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                        {release.date}
                                    </div>
                                </div>

                                <div className="song-grid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                    gap: '12px'
                                }}>
                                    {release.songs.map((songTitle, sIndex) => {
                                        // Try to find ID
                                        // We need to handle the translation here manually since we can't import server util
                                        // Or we pass a map from parent.
                                        // For MVP, we look in songIdMap.

                                        // Logic: Iterate keys of songIdMap, check if key is normalized version of songTitle?
                                        // Too expensive.
                                        // Better: Just assume songIdMap has the title.

                                        // Let's try raw title first.
                                        let foundId = songIdMap?.get(songTitle);

                                        // If not found, existing songIdMap keys are the "Golden" titles.
                                        // DISCOGRAPHY might have aliases. 
                                        // We'll skip complex matching for now and just link if found.

                                        const isCollected = !!foundId;

                                        return (
                                            <Link
                                                key={sIndex}
                                                to={isCollected ? `/song/${encodeURIComponent(songTitle)}` : '#'}
                                                style={{
                                                    textDecoration: 'none',
                                                    pointerEvents: isCollected ? 'auto' : 'none'
                                                }}
                                            >
                                                <div style={{
                                                    background: isCollected ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                                                    padding: '12px 16px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    border: '1px solid transparent',
                                                    transition: 'all 0.2s',
                                                    opacity: isCollected ? 1 : 0.5
                                                }}
                                                    className={isCollected ? "hover-card" : ""}
                                                >
                                                    <div style={{
                                                        color: isCollected ? 'var(--primary-color)' : '#475569',
                                                        fontSize: '0.8rem',
                                                        width: '20px'
                                                    }}>
                                                        {sIndex + 1}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{
                                                            color: isCollected ? '#e2e8f0' : '#64748b',
                                                            fontWeight: '500'
                                                        }}>
                                                            {songTitle}
                                                        </div>
                                                    </div>
                                                    {isCollected && <ArrowRight size={14} color="#475569" />}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Simple icon component if lucide import fails in this context (but it should work)
function ArrowRight({ size, color }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    )
}

export default Songs;
