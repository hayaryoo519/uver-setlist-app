import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Plus, Trash2, Save, X, ArrowUp, ArrowDown, Edit2, GripVertical, Replace, CheckCircle, ListMusic, ChevronUp, ChevronDown } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import BulkImportModal from './BulkImportModal';

// Sortable Item Component
const SortableItem = ({ id, song, index, styles, onRemove, onEditStart, isEditingTarget }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        ...styles
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 bg-slate-800 p-2 rounded border group transition-colors ${isEditingTarget
                ? 'border-yellow-400 bg-yellow-400/10'
                : 'border-slate-700 hover:border-blue-500/50'
                }`}
        >
            <div {...attributes} {...listeners} className="cursor-grab hover:text-white text-slate-600 flex items-center justify-center p-1">
                <GripVertical size={16} />
            </div>

            <div className={`w-6 text-center font-mono font-bold ${isEditingTarget ? 'text-yellow-400' : 'text-slate-500'}`}>
                {index + 1}
            </div>

            <div className="flex-1 font-medium text-slate-200 truncate">
                {song.title}
            </div>

            <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEditStart(index)}
                    className={`p-1 rounded transition-colors ${isEditingTarget ? 'bg-yellow-400 text-black' : 'hover:bg-slate-700 text-slate-400 hover:text-blue-400'}`}
                    title="Replace this song"
                >
                    <Replace size={16} />
                </button>
                <button
                    onClick={() => onRemove(index)}
                    className="p-1 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-400"
                    title="Remove"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

const SetlistEditor = ({ liveId, onClose, liveDate, liveTitle, onEditLive }) => {
    const [currentSetlist, setCurrentSetlist] = useState([]);
    const [allSongs, setAllSongs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);

    // Index of the song currently being replaced (null if adding new)
    const [editingIndex, setEditingIndex] = useState(null);

    // トースト通知
    const [toast, setToast] = useState(null);
    // セトリストプレビュー表示フラグ
    const [showSetlistPreview, setShowSetlistPreview] = useState(false);
    // セトリスト側のスクロールコンテナ参照
    const setlistScrollRef = useRef(null);

    // 追加済み曲IDのセット（高速判定用）
    const addedSongIds = useMemo(() => new Set(currentSetlist.map(s => s.id)), [currentSetlist]);

    // トースト表示ヘルパー
    const showToast = useCallback((message) => {
        setToast(message);
        setTimeout(() => setToast(null), 2500);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchData();
    }, [liveId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { token };

            const liveRes = await fetch(`/api/lives/${liveId}`, { headers });
            const liveData = await liveRes.json();

            if (liveData.setlist) {
                setCurrentSetlist(liveData.setlist.map(item => ({
                    id: item.song_id,
                    title: item.title,
                    tempId: `item-${item.song_id}-${Math.random()}`
                })));
            }

            const songsRes = await fetch('/api/songs', { headers });
            const songsData = await songsRes.json();
            setAllSongs(songsData);

        } catch (err) {
            console.error(err);
            alert("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddOrSwapSong = (song) => {
        if (editingIndex !== null) {
            // Swap Mode
            const newList = [...currentSetlist];
            newList[editingIndex] = { ...song, tempId: `item-${song.id}-${Math.random()}` };
            setCurrentSetlist(newList);
            setEditingIndex(null); // Exit edit mode
        } else {
            // Add Mode
            const newTempId = `item-${song.id}-${Math.random()}`;
            setCurrentSetlist([...currentSetlist, { ...song, tempId: newTempId }]);

            // トースト通知
            showToast(`✅ 「${song.title}」を追加しました（#${currentSetlist.length + 1}）`);
            // 追加後にリスト末尾へ自動スクロール
            setTimeout(() => {
                if (setlistScrollRef.current) {
                    setlistScrollRef.current.scrollTo({ top: setlistScrollRef.current.scrollHeight, behavior: 'smooth' });
                }
            }, 100);
        }
    };

    const handleBulkImport = (importedSongs) => {
        const newItems = importedSongs.map(s => ({ ...s, tempId: `item-${s.id}-${Math.random()}` }));
        setCurrentSetlist(prev => [...prev, ...newItems]);
        setShowBulkImport(false);
    };

    const handleRemoveSong = (index) => {
        const newList = [...currentSetlist];
        newList.splice(index, 1);
        setCurrentSetlist(newList);
        if (editingIndex === index) setEditingIndex(null);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setCurrentSetlist((items) => {
                const oldIndex = items.findIndex((item) => item.tempId === active.id);
                const newIndex = items.findIndex((item) => item.tempId === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const songIds = currentSetlist.map(s => s.id);
            const res = await fetch(`/api/lives/${liveId}/setlist`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify({ songs: songIds })
            });

            if (res.ok) {
                alert("Setlist saved successfully!");
                onClose();
            } else {
                alert("Failed to save setlist");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving setlist");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredSongs = allSongs.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);

    if (isLoading) return <div className="p-4">Loading editor...</div>;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
                {/* ヘッダー */}
                <div className="p-3 md:p-4 border-b border-slate-700 flex flex-wrap justify-between items-center gap-2 bg-slate-800 rounded-t-lg">
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                            Setlist Editor
                            <span className="text-xs md:text-sm font-normal text-slate-400 bg-slate-700 px-2 py-1 rounded truncate max-w-[200px] md:max-w-none">
                                {liveDate} {liveTitle}
                            </span>
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setShowBulkImport(true)} className="flex items-center gap-1 md:gap-2 bg-blue-600 hover:bg-blue-500 text-white px-2 md:px-4 py-2 rounded font-medium transition-colors text-sm">
                            <ArrowDown size={16} /> <span className="hidden md:inline">Bulk Import</span>
                        </button>
                        <button onClick={onEditLive} className="flex items-center gap-1 md:gap-2 bg-slate-700 hover:bg-slate-600 text-white px-2 md:px-4 py-2 rounded font-medium transition-colors text-sm">
                            <Edit2 size={16} /> <span className="hidden md:inline">Edit Details</span>
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1 md:gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-2 md:px-4 py-2 rounded font-medium transition-colors text-sm">
                            <Save size={16} /> {isSaving ? '...' : <span className="hidden md:inline">Save Setlist</span>}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* LEFT: Current Setlist (Droppable) */}
                    <div ref={setlistScrollRef} className="flex-1 overflow-y-auto p-4 border-r border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Current List ({currentSetlist.length} Songs)</h3>
                            {editingIndex !== null && (
                                <div className="text-xs text-yellow-400 flex items-center gap-2 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/20">
                                    <Replace size={12} />
                                    Select a song from the right to replace #{editingIndex + 1}
                                    <button onClick={() => setEditingIndex(null)} className="ml-2 text-slate-400 hover:text-white"><X size={12} /></button>
                                </div>
                            )}
                        </div>

                        {currentSetlist.length === 0 ? (
                            <div className="text-center py-20 text-slate-600 border-2 border-dashed border-slate-800 rounded-lg">
                                No songs in setlist yet.<br />Search and add songs from the right panel.
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={currentSetlist.map(s => s.tempId)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-2 pb-20">
                                        {currentSetlist.map((song, index) => (
                                            <SortableItem
                                                key={song.tempId}
                                                id={song.tempId}
                                                song={song}
                                                index={index}
                                                onRemove={handleRemoveSong}
                                                onEditStart={setEditingIndex}
                                                isEditingTarget={editingIndex === index}

                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>

                    {/* RIGHT: Song Selector */}
                    <div className={`w-full md:w-80 bg-slate-800/50 p-4 flex flex-col border-l border-slate-700 transition-colors ${editingIndex !== null ? 'border-l-yellow-400/30 bg-yellow-900/5' : ''}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`font-bold uppercase text-xs tracking-wider transition-colors ${editingIndex !== null ? 'text-yellow-400' : 'text-slate-400'}`}>
                                {editingIndex !== null ? 'Replace Song' : 'Add Songs'}
                            </h3>
                            {currentSetlist.length > 0 && (
                                <button
                                    onClick={() => setShowSetlistPreview(!showSetlistPreview)}
                                    className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-2 py-1 rounded transition-colors"
                                >
                                    <ListMusic size={14} />
                                    <span>{currentSetlist.length}曲</span>
                                    {showSetlistPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                            )}
                        </div>

                        {/* セトリストプレビュー */}
                        {showSetlistPreview && currentSetlist.length > 0 && (
                            <div className="mb-3 bg-slate-900/80 border border-slate-600 rounded-lg p-2 max-h-40 overflow-y-auto">
                                <div className="space-y-1">
                                    {currentSetlist.map((song, index) => (
                                        <div key={song.tempId} className="flex items-center gap-2 text-xs text-slate-300 px-1 py-0.5">
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
                                placeholder="Search song title..."
                                className="w-full bg-slate-900 border border-slate-700 rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1">
                            {filteredSongs.length === 0 && searchTerm && (
                                <div className="text-slate-500 text-sm text-center py-4">No matching songs.</div>
                            )}
                            {filteredSongs.map(song => {
                                const isAdded = addedSongIds.has(song.id);
                                return (
                                    <button
                                        key={song.id}
                                        onClick={() => handleAddOrSwapSong(song)}
                                        className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center group transition-colors ${editingIndex !== null
                                            ? 'hover:bg-yellow-400/20 hover:text-yellow-200 text-slate-300'
                                            : isAdded
                                                ? 'bg-slate-700/30 text-slate-500'
                                                : 'hover:bg-blue-600/20 hover:text-blue-400 text-slate-300'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {isAdded && editingIndex === null && (
                                                <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                                            )}
                                            <span className={isAdded && editingIndex === null ? 'line-through opacity-60' : ''}>{song.title}</span>
                                        </span>
                                        {editingIndex !== null ? (
                                            <Replace size={16} className="opacity-0 group-hover:opacity-100 text-yellow-400 flex-shrink-0" />
                                        ) : (
                                            <Plus size={16} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <p className="text-xs text-slate-500 text-center">
                                Can't find a song?<br />Add it in the "Songs" tab first.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bulk Import Modal */}
                {showBulkImport && (
                    <BulkImportModal
                        onClose={() => setShowBulkImport(false)}
                        onImport={handleBulkImport}
                        allSongs={allSongs}
                    />
                )}

                {/* トースト通知 */}
                {toast && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-2xl text-sm font-medium z-[60] animate-bounce-in"
                        style={{ animation: 'toastSlideUp 0.3s ease-out' }}>
                        {toast}
                    </div>
                )}

                <style>{`
                    @keyframes toastSlideUp {
                        from { opacity: 0; transform: translate(-50%, 20px); }
                        to { opacity: 1; transform: translate(-50%, 0); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default SetlistEditor;
