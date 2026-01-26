import React from 'react';
import { Search, Tag, MapPin } from 'lucide-react';


const FilterPanel = ({ filters, onChange, venues, songs = [] }) => {


    const handleTextChange = (e) => {
        onChange({ ...filters, text: e.target.value });
    };

    const clearFilters = () => {
        onChange({ text: '', venue: '', songIds: [], startDate: '', endDate: '' });
    };


    const sortedSongs = React.useMemo(() => {
        return [...songs].sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    }, [songs]);

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
                        placeholder="キーワード検索 (ツアー名, 会場, 年など)..."
                        value={filters.text}
                        onChange={handleTextChange}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                    />
                </div>

                {/* Advanced Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Date Range Filter */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="date"
                                placeholder="From"
                                value={filters.startDate || ''}
                                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                            />
                            <div className="absolute right-0 top-[-20px] text-xs text-slate-500">Since</div>
                        </div>
                        <div className="relative flex-1">
                            <input
                                type="date"
                                placeholder="To"
                                value={filters.endDate || ''}
                                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                            />
                            <div className="absolute right-0 top-[-20px] text-xs text-slate-500">Until</div>
                        </div>
                    </div>

                    {/* Venue Filter Removed per user request */}


                    {/* Song Filter (grouped by album/single) */}
                    <div className="relative">
                        <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">♫</div>
                        <select
                            value={(filters.songIds && filters.songIds[0]) || ''}
                            onChange={handleSongChange}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-8 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer text-sm"
                            disabled={songs.length === 0}
                        >
                            <option value="">すべての楽曲</option>
                            {(() => {
                                // Group songs by album
                                const grouped = sortedSongs.reduce((acc, song) => {
                                    const album = song.album || 'その他';
                                    if (!acc[album]) acc[album] = [];
                                    acc[album].push(song);
                                    return acc;
                                }, {});

                                // Define album order (newest first, with special categories at end)
                                const albumOrder = [
                                    'ENIGMASIS',
                                    '30',
                                    'UNSER',
                                    'TYCOON',
                                    'Ø CHOIR',
                                    'THE ONE',
                                    'LIFE 6 SENSE',
                                    'LAST',
                                    'AwakEVE',
                                    'PROGLUTION',
                                    'BUGRIGHT',
                                    'Timeless',
                                    'Single',
                                    'Video',
                                    'その他'
                                ];

                                return Object.entries(grouped)
                                    .sort(([a], [b]) => {
                                        const aIndex = albumOrder.indexOf(a);
                                        const bIndex = albumOrder.indexOf(b);
                                        // If both are in order list, sort by index
                                        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                        // If only one is in list, it comes first
                                        if (aIndex !== -1) return -1;
                                        if (bIndex !== -1) return 1;
                                        // Otherwise alphabetical
                                        return a.localeCompare(b, 'ja');
                                    })
                                    .map(([album, albumSongs]) => (
                                        <optgroup key={album} label={album}>
                                            {albumSongs.sort((a, b) => a.title.localeCompare(b.title, 'ja')).map(song => (
                                                <option key={song.id} value={song.id}>{song.title}</option>
                                            ))}
                                        </optgroup>
                                    ));
                            })()}
                        </select>
                        <div className="absolute right-3 top-4 text-slate-500 pointer-events-none">▼</div>
                    </div>
                </div>

                {/* Clear Button - Show only if filters active */}
                <div className="flex justify-end mt-4">
                    {(filters.text || filters.venue || filters.songIds.length > 0 || filters.startDate || filters.endDate) && (
                        <button
                            onClick={clearFilters}
                            className="text-slate-400 hover:text-white text-sm underline decoration-slate-600 hover:decoration-white underline-offset-4 transition-colors"
                        >
                            条件をクリア
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
