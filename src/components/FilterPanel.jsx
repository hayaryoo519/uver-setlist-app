import React from 'react';
import { Search, Tag, MapPin } from 'lucide-react';

export const PRESET_FILTERS = [
    { id: 'xmas', label: 'Xmas / Christmas', match: (live) => (live.title && (live.title.toLowerCase().includes('xmas') || live.title.includes('クリスマス'))) },
    { id: 'birthday', label: 'Birthday / Seitansai', match: (live) => (live.title && (live.title.toLowerCase().includes('birthday') || live.title.includes('生誕'))) },
    { id: 'budokan', label: 'Budokan', match: (live) => (live.venue && (live.venue.includes('武道館') || live.venue.toLowerCase().includes('budokan'))) },
    { id: 'arena', label: 'Arena Tour', match: (live) => (live.venue && (live.venue.includes('アリーナ') || live.venue.toLowerCase().includes('arena'))) },
    { id: 'taiban', label: 'Event / Taiban', match: (live) => (live.type === 'EVENT' || (live.title && live.title.includes('対バン'))) },
    { id: 'men', label: 'Danjri / Men Only', match: (live) => (live.title && (live.title.includes('男祭り') || live.title.includes('KING'))) },
    { id: 'women', label: 'Women Only', match: (live) => (live.title && (live.title.includes('女祭り') || live.title.includes('QUEEN'))) },
];

const FilterPanel = ({ filters, onChange, venues, songs = [] }) => {

    const toggleTag = (tagId) => {
        const newTags = filters.tags.includes(tagId)
            ? filters.tags.filter(t => t !== tagId)
            : [...filters.tags, tagId];
        onChange({ ...filters, tags: newTags });
    };

    const handleTextChange = (e) => {
        onChange({ ...filters, text: e.target.value });
    };

    const clearFilters = () => {
        onChange({ text: '', tags: [], venue: '', songIds: [], album: '' });
    };

    // Derived Lists
    const albums = React.useMemo(() => {
        const list = songs.map(s => s.album).filter(Boolean);
        return [...new Set(list)].sort();
    }, [songs]);

    const sortedSongs = React.useMemo(() => {
        // If album is selected, filter songs by that album
        let filtered = songs;
        if (filters.album) {
            filtered = songs.filter(s => s.album === filters.album);
        }
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }, [songs, filters.album]);

    // Handle song selection (multi-select not supported easily in pure select, so single for now or custom logic)
    // Actually, task said "songIds" (plural). But simple dropdown handles one.
    // Let's implement single song selection for simplicity now, or allow adding to list.
    // Implementation: Dropdown selects ONE song. If user wants multiple, we need "Add" UI.
    // Let's stick to SINGLE song filter for MVP UI, but state supports array.
    const handleSongChange = (e) => {
        const id = parseInt(e.target.value);
        if (id) {
            onChange({ ...filters, songIds: [id] }); // Single song search for now
        } else {
            onChange({ ...filters, songIds: [] });
        }
    };

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-8 backdrop-blur-sm shadow-xl">
            <div className="flex flex-col gap-6">

                {/* Text Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by keywords (e.g. Tour name, Venue, Year)..."
                        value={filters.text}
                        onChange={handleTextChange}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                    />
                </div>

                {/* Advanced Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Venue Filter */}
                    <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
                        <select
                            value={filters.venue || ''}
                            onChange={(e) => onChange({ ...filters, venue: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-8 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer text-sm"
                        >
                            <option value="">All Venues</option>
                            {(venues || []).map(venue => (
                                <option key={venue} value={venue}>{venue}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-4 text-slate-500 pointer-events-none">▼</div>
                    </div>

                    {/* Album Filter */}
                    <div className="relative">
                        <Tag className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
                        <select
                            value={filters.album || ''}
                            onChange={(e) => onChange({ ...filters, album: e.target.value, songIds: [] })} // Reset song when album changes? Maybe.
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-8 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer text-sm"
                        >
                            <option value="">All Albums</option>
                            {albums.map(album => (
                                <option key={album} value={album}>{album}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-4 text-slate-500 pointer-events-none">▼</div>
                    </div>

                    {/* Song Filter */}
                    <div className="relative">
                        <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">♫</div>
                        <select
                            value={(filters.songIds && filters.songIds[0]) || ''}
                            onChange={handleSongChange}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-8 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer text-sm"
                            disabled={songs.length === 0}
                        >
                            <option value="">All Songs {filters.album ? `(in ${filters.album})` : ''}</option>
                            {sortedSongs.map(song => (
                                <option key={song.id} value={song.id}>{song.title}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-4 text-slate-500 pointer-events-none">▼</div>
                    </div>
                </div>

                {/* Preset Tags & Clear */}
                <div className="flex justify-between items-end flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <Tag size={12} />
                            <span>Quick Filters</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_FILTERS.map(filter => {
                                const isActive = filters.tags.includes(filter.id);
                                return (
                                    <button
                                        key={filter.id}
                                        onClick={() => toggleTag(filter.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${isActive
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50'
                                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200 hover:bg-slate-700'
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Clear Button - Show only if filters active */}
                    {(filters.text || filters.venue || filters.album || filters.songIds.length > 0 || filters.tags.length > 0) && (
                        <button
                            onClick={clearFilters}
                            className="text-slate-400 hover:text-white text-sm underline decoration-slate-600 hover:decoration-white underline-offset-4 transition-colors"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
