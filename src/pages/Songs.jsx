import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DISCOGRAPHY } from '../data/discography';
import { useGlobalStats } from '../hooks/useGlobalStats';
import SEO from '../components/SEO';
import { Disc, Music, Calendar, Search, Filter, ArrowUpDown, ChevronRight } from 'lucide-react';

// Simple normalization helper (client-side version)
const normalizeSongTitle = (title) => {
    if (!title) return "";
    return title
        .toLowerCase()
        .replace(/[!'#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, "")
        .replace(/\s+/g, "");
};

// Release Item Component to handle its own image fetching if needed
const ReleaseItem = ({ release, index, songDataMap }) => {
    const [albumImage, setAlbumImage] = useState(null);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        // Always fetch from the dedicated album image API (uses album_cache)
        const fetchAlbumImage = async () => {
            if (isFetching || albumImage) return;
            setIsFetching(true);
            try {
                const res = await fetch(`/api/music/album-image/${encodeURIComponent(release.title)}`);
                if (!res.ok) throw new Error('API response error');
                const data = await res.json();
                if (data.image_url) {
                    setAlbumImage(data.image_url);
                }
            } catch (err) {
                console.error(`Failed to fetch album image for ${release.title}:`, err);
            } finally {
                setIsFetching(false);
            }
        };

        fetchAlbumImage();
    }, [release.title]);

    return (
        <div
            id={`release-${release.title}`}
            className="scroll-mt-32 opacity-0 animate-[fade-in-up_0.5s_ease-out_forwards]"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Release Item Header */}
            <div className="group flex flex-col sm:flex-row sm:items-center gap-6 p-6 mb-6 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-yellow-500/30 transition-all backdrop-blur-md shadow-2xl">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-950 rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-800 group-hover:border-yellow-500/50 transition-all duration-500 overflow-hidden shadow-inner group-hover:scale-105">
                    {albumImage ? (
                        <img src={albumImage} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : isFetching ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <Disc className="w-12 h-12 text-slate-700 group-hover:text-yellow-500/80 transition-colors" />
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border tracking-[0.1em] uppercase ${
                            release.type === 'ALBUM' 
                                ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' 
                                : 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                        }`}>
                            {release.type}
                        </span>
                        <div className="text-slate-400 text-xs font-mono tracking-widest flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {release.date.replaceAll('-', '.')}
                        </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-yellow-500 transition-colors truncate font-oswald tracking-wider uppercase">
                        {release.title}
                    </h2>
                    <p className="text-slate-500 text-xs mt-2 font-medium tracking-wide">
                        {release.songs.length} Tracks included in this release
                    </p>
                </div>
            </div>

            {/* Songs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {release.songs.map((songTitle, sIndex) => {
                    const songData = songDataMap?.get(songTitle);
                    const isCollected = !!songData;

                    return (
                        <Link
                            key={sIndex}
                            to={isCollected ? `/song/${encodeURIComponent(songTitle.replace(/\s+/g, ''))}` : '#'}
                            className={`group flex items-center gap-5 p-4 rounded-2xl border transition-all duration-300 ${isCollected
                                    ? 'bg-white/5 border-transparent hover:bg-white/10 hover:border-yellow-500/30 cursor-pointer hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-yellow-500/5'
                                    : 'bg-white/5 opacity-40 border-transparent cursor-not-allowed'
                                }`}
                            style={{ pointerEvents: isCollected ? 'auto' : 'none' }}
                        >
                            {/* Song Number (Replaces Image) */}
                            <div className="w-10 h-10 flex items-center justify-center font-mono text-sm font-black text-slate-500 group-hover:text-yellow-500 transition-colors bg-slate-900/50 rounded-xl border border-slate-800/50 group-hover:border-yellow-500/30">
                                {String(sIndex + 1).padStart(2, '0')}
                            </div>

                            <div className={`flex-1 font-black truncate text-base tracking-wide ${isCollected ? 'text-slate-200 group-hover:text-white' : 'text-slate-500'}`}>
                                {songTitle}
                            </div>
                            
                            {isCollected && (
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-yellow-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

function Songs() {
    const { loading, songDataMap, error } = useGlobalStats();
    const location = useLocation();

    // Handle hash scroll on mount/location change
    useEffect(() => {
        if (location.hash) {
            const targetId = decodeURIComponent(location.hash.slice(1));
            setTimeout(() => {
                const element = document.getElementById(`release-${targetId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    element.classList.add('highlight-pulse');
                    setTimeout(() => element.classList.remove('highlight-pulse'), 2000);
                }
            }, 100);
        }
    }, [location]);

    // Filter and Sort state
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, ALBUM, SINGLE
    const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, title-asc, title-desc

    // Filtered and sorted discography
    const filteredDiscography = useMemo(() => {
        let result = [...DISCOGRAPHY];

        if (typeFilter !== 'ALL') {
            result = result.filter(r => r.type === typeFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.map(release => {
                const titleMatch = release.title.toLowerCase().includes(query);
                const matchingSongs = release.songs.filter(s => s.toLowerCase().includes(query));

                if (titleMatch) {
                    return release;
                } else if (matchingSongs.length > 0) {
                    return { ...release, songs: matchingSongs };
                }
                return null;
            }).filter(Boolean);
        }

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
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <SEO title="Discography" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 pb-2 border-b border-white/5 gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-4xl sm:text-5xl font-black font-oswald tracking-tighter text-white uppercase leading-none">
                            Discography
                        </h1>
                        <div className="text-slate-400 text-sm sm:text-base font-bold uppercase tracking-[0.2em] mt-1">
                            Total <span className="text-yellow-500 font-black font-mono text-lg sm:text-xl ml-1">{DISCOGRAPHY.length}</span> Releases
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        {(searchQuery || typeFilter !== 'ALL') && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <Search className="w-3 h-3 text-yellow-500" />
                                <span className="text-yellow-500 text-xs font-bold">{filteredDiscography.length} Matches Found</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-8 p-5 bg-white/5 rounded-2xl border border-white/5 shadow-lg backdrop-blur-sm">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="曲名・アルバム名で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 transition-colors"
                        />
                    </div>

                    <div className="flex items-center relative gap-2">
                        <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="pl-9 pr-8 py-2.5 bg-slate-950/40 border border-slate-700 rounded-xl text-white text-sm cursor-pointer focus:outline-none focus:border-yellow-500 transition-colors appearance-none min-w-[120px]"
                        >
                            <option value="ALL">すべて</option>
                            <option value="ALBUM">アルバム</option>
                            <option value="SINGLE">シングル</option>
                        </select>
                        <div className="absolute right-3 pointer-events-none text-slate-400 text-xs text-center pr-1">▼</div>
                    </div>

                    <div className="flex items-center relative gap-2">
                        <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="pl-9 pr-8 py-2.5 bg-slate-950/40 border border-slate-700 rounded-xl text-white text-sm cursor-pointer focus:outline-none focus:border-yellow-500 transition-colors appearance-none min-w-[150px]"
                        >
                            <option value="date-desc">新しい順</option>
                            <option value="date-asc">古い順</option>
                            <option value="title-asc">タイトル A→Z</option>
                            <option value="title-desc">タイトル Z→A</option>
                        </select>
                        <div className="absolute right-3 pointer-events-none text-slate-400 text-xs text-center pr-1">▼</div>
                    </div>
                </div>

                {error ? (
                    <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-2xl">
                        <h3 className="text-red-400 font-bold mb-2">Connection Error</h3>
                        <p className="text-red-300/80 mb-2">{error}</p>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center items-center py-20 text-slate-500 animate-pulse">
                        Loading Discography...
                    </div>
                ) : (
                    <div className="space-y-16">
                        {filteredDiscography.map((release, index) => (
                            <ReleaseItem 
                                key={release.title} 
                                release={release} 
                                index={index} 
                                songDataMap={songDataMap} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Songs;

