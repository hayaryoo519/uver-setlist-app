import React from 'react';
import { Search, Plus, Replace, CheckCircle, ListMusic, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * 楽曲を検索して選択・追加するためのパネルコンポーネント。
 * SetlistEditor と BulkImportModal の両方で使用されます。
 */
const SongSelector = ({
    songs,
    searchTerm,
    onSearchChange,
    onSelect,
    isEditing = false,
    editingIndex = null,
    addedSongIds = new Set(),
    showSetlistPreview = false,
    onTogglePreview,
    currentSetlistCount = 0,
    currentSetlist = [],
    placeholder = "曲名を入力して検索..."
}) => {
    return (
        <div className={`w-full md:w-80 bg-slate-800/50 p-4 flex flex-col border-l border-slate-700 transition-colors ${isEditing ? 'border-l-yellow-400/30 bg-yellow-900/5' : ''}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`font-bold uppercase text-xs tracking-wider transition-colors ${isEditing ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {isEditing ? '曲を差し替える' : '曲を追加する'}
                </h3>
                {currentSetlistCount > 0 && onTogglePreview && (
                    <button
                        onClick={onTogglePreview}
                        className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-2 py-1 rounded transition-colors"
                    >
                        <ListMusic size={14} />
                        <span>{currentSetlistCount}曲</span>
                        {showSetlistPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                )}
            </div>

            {/* セトリストプレビュー */}
            {showSetlistPreview && currentSetlist.length > 0 && (
                <div className="mb-3 bg-slate-900/80 border border-slate-600 rounded-lg p-2 max-h-40 overflow-y-auto">
                    <div className="space-y-1">
                        {currentSetlist.map((song, index) => (
                            <div key={song.tempId || index} className="flex items-center gap-2 text-xs text-slate-300 px-1 py-0.5">
                                <span className="text-slate-500 font-mono w-5 text-right">{index + 1}.</span>
                                <span className="truncate">{song.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mb-4 relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
                {songs.length === 0 && searchTerm && (
                    <div className="text-slate-500 text-sm text-center py-4">該当する曲がありません</div>
                ) }
                {!searchTerm && songs.length === 0 && (
                    <div className="text-slate-600 text-[10px] text-center py-8">
                        曲名を入力して検索してください
                    </div>
                )}
                {songs.map(song => {
                    const isAdded = addedSongIds.has(song.id);
                    return (
                        <button
                            key={song.id}
                            onClick={() => onSelect(song)}
                            className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center group transition-colors ${isEditing
                                ? 'hover:bg-yellow-400/20 hover:text-yellow-200 text-slate-300 border border-transparent hover:border-yellow-400/30'
                                : isAdded
                                    ? 'bg-slate-700/30 text-slate-500'
                                    : 'hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 border border-transparent hover:border-blue-500/30'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                {isAdded && !isEditing && (
                                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                                )}
                                <span className={isAdded && !isEditing ? 'line-through opacity-60' : ''}>{song.title}</span>
                            </span>
                            {isEditing ? (
                                <Replace size={16} className="opacity-0 group-hover:opacity-100 text-yellow-400 flex-shrink-0" />
                            ) : (
                                <Plus size={16} className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-blue-400" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-500 text-center">
                    曲が見つからない場合は、先に「Songs」タブで追加してください。
                </p>
            </div>
        </div>
    );
};

export default SongSelector;
