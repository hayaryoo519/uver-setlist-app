import React from 'react';
import { Search, Tag } from 'lucide-react';

export const PRESET_FILTERS = [
    { id: 'xmas', label: 'Xmas / Christmas', match: (live) => (live.title && (live.title.toLowerCase().includes('xmas') || live.title.includes('クリスマス'))) },
    { id: 'birthday', label: 'Birthday / Seitansai', match: (live) => (live.title && (live.title.toLowerCase().includes('birthday') || live.title.includes('生誕'))) },
    { id: 'budokan', label: 'Budokan', match: (live) => (live.venue && (live.venue.includes('武道館') || live.venue.toLowerCase().includes('budokan'))) },
    { id: 'arena', label: 'Arena Tour', match: (live) => (live.venue && (live.venue.includes('アリーナ') || live.venue.toLowerCase().includes('arena'))) },
    { id: 'taiban', label: 'Event / Taiban', match: (live) => (live.type === 'EVENT' || (live.title && live.title.includes('対バン'))) },
    { id: 'men', label: 'Danjri / Men Only', match: (live) => (live.title && (live.title.includes('男祭り') || live.title.includes('KING'))) },
    { id: 'women', label: 'Women Only', match: (live) => (live.title && (live.title.includes('女祭り') || live.title.includes('QUEEN'))) },
];

const FilterPanel = ({ filters, onChange }) => {

    const toggleTag = (tagId) => {
        const newTags = filters.tags.includes(tagId)
            ? filters.tags.filter(t => t !== tagId)
            : [...filters.tags, tagId];
        onChange({ ...filters, tags: newTags });
    };

    const handleTextChange = (e) => {
        onChange({ ...filters, text: e.target.value });
    };

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-8 backdrop-blur-sm">
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

                {/* Preset Tags */}
                <div>
                    <div className="flex items-center gap-2 mb-3 text-slate-400 text-sm font-medium uppercase tracking-wider">
                        <Tag size={14} />
                        <span>Quick Filters</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_FILTERS.map(filter => {
                            const isActive = filters.tags.includes(filter.id);
                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => toggleTag(filter.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${isActive
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transform scale-105'
                                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
