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

        // Deduplicate songs with similar titles (e.g., "Don't Think.Sing" vs "Don't Think. Sing")
        // Normalize: lowercase, remove spaces/punctuation differences
        const normalizeTitle = (title) => {
            return title
                .toLowerCase()
                .replace(/[.\s\-~～・　]/g, '') // Remove dots, spaces, hyphens, tildes
                .replace(/[（）()]/g, '')        // Remove parentheses
                .trim();
        };

        const seen = new Map();
        const deduplicated = filtered.filter(song => {
            const normalized = normalizeTitle(song.title);
            if (seen.has(normalized)) {
                return false; // Skip duplicate
            }
            seen.set(normalized, true);
            return true;
        });

        return deduplicated.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
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
                        placeholder="キーワード検索 (ツアー名, 会場, 年など)..."
                        value={filters.text}
                        onChange={handleTextChange}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                    />
                </div>

                {/* Advanced Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Venue Filter (grouped by prefecture) */}
                    <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
                        <select
                            value={filters.venue || ''}
                            onChange={(e) => onChange({ ...filters, venue: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-8 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer text-sm"
                        >
                            <option value="">すべての会場</option>
                            {(() => {
                                // Prefecture name mapping: Romaji → Kanji
                                const prefectureNameMap = {
                                    'Hokkaido': '北海道',
                                    'Aomori': '青森県',
                                    'Iwate': '岩手県',
                                    'Miyagi': '宮城県',
                                    'Akita': '秋田県',
                                    'Yamagata': '山形県',
                                    'Fukushima': '福島県',
                                    'Ibaraki': '茨城県',
                                    'Tochigi': '栃木県',
                                    'Gunma': '群馬県',
                                    'Saitama': '埼玉県',
                                    'Chiba': '千葉県',
                                    'Tokyo': '東京都',
                                    'Kanagawa': '神奈川県',
                                    'Niigata': '新潟県',
                                    'Toyama': '富山県',
                                    'Ishikawa': '石川県',
                                    'Fukui': '福井県',
                                    'Yamanashi': '山梨県',
                                    'Nagano': '長野県',
                                    'Gifu': '岐阜県',
                                    'Shizuoka': '静岡県',
                                    'Aichi': '愛知県',
                                    'Mie': '三重県',
                                    'Shiga': '滋賀県',
                                    'Kyoto': '京都府',
                                    'Osaka': '大阪府',
                                    'Hyogo': '兵庫県',
                                    'Nara': '奈良県',
                                    'Wakayama': '和歌山県',
                                    'Tottori': '鳥取県',
                                    'Shimane': '島根県',
                                    'Okayama': '岡山県',
                                    'Hiroshima': '広島県',
                                    'Yamaguchi': '山口県',
                                    'Tokushima': '徳島県',
                                    'Kagawa': '香川県',
                                    'Ehime': '愛媛県',
                                    'Kochi': '高知県',
                                    'Fukuoka': '福岡県',
                                    'Saga': '佐賀県',
                                    'Nagasaki': '長崎県',
                                    'Kumamoto': '熊本県',
                                    'Oita': '大分県',
                                    'Miyazaki': '宮崎県',
                                    'Kagoshima': '鹿児島県',
                                    'Okinawa': '沖縄県',
                                    'その他': 'その他'
                                };

                                const grouped = (venues || []).reduce((acc, item) => {
                                    const pref = item.prefecture || 'その他';
                                    if (!acc[pref]) acc[pref] = [];
                                    acc[pref].push(item.venue);
                                    return acc;
                                }, {});

                                return Object.entries(grouped)
                                    .sort(([a], [b]) => {
                                        // Always put 'その他' at the bottom
                                        if (a === 'その他') return 1;
                                        if (b === 'その他') return -1;
                                        const aJa = prefectureNameMap[a] || a;
                                        const bJa = prefectureNameMap[b] || b;
                                        return aJa.localeCompare(bJa, 'ja');
                                    })
                                    .map(([prefecture, venueList]) => (
                                        <optgroup key={prefecture} label={prefectureNameMap[prefecture] || prefecture}>
                                            {venueList.sort().map(venue => (
                                                <option key={venue} value={venue}>{venue}</option>
                                            ))}
                                        </optgroup>
                                    ));
                            })()}
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
                            <option value="">すべてのアルバム</option>
                            {albums.map(album => (
                                <option key={album} value={album}>{album}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-4 text-slate-500 pointer-events-none">▼</div>
                    </div>

                    {/* Song Filter (grouped by album/single) */}
                    <div className="relative">
                        <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">♫</div>
                        <select
                            value={(filters.songIds && filters.songIds[0]) || ''}
                            onChange={handleSongChange}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-8 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer text-sm"
                            disabled={songs.length === 0}
                        >
                            <option value="">すべての楽曲 {filters.album ? `(${filters.album})` : ''}</option>
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

                {/* Preset Tags & Clear */}
                <div className="flex justify-between items-end flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <Tag size={12} />
                            <span>クイック絞り込み</span>
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
                            条件をクリア
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
