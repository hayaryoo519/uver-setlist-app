import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';

const SetlistEditor = ({ liveId, onClose, liveDate, liveTitle }) => {
    const [currentSetlist, setCurrentSetlist] = useState([]);
    const [allSongs, setAllSongs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [liveId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { token };

            // 1. Fetch Live Details (including current setlist)
            const liveRes = await fetch(`http://localhost:4000/api/lives/${liveId}`, { headers });
            const liveData = await liveRes.json();

            // Map to local state format
            if (liveData.setlist) {
                // setlist comes as [{ song_id, title, position }, ...]
                setCurrentSetlist(liveData.setlist.map(item => ({
                    id: item.song_id,
                    title: item.title,
                    tempId: Math.random() // useful for key if needed, though id is better
                })));
            }

            // 2. Fetch All Songs for search
            const songsRes = await fetch('http://localhost:4000/api/songs', { headers });
            const songsData = await songsRes.json();
            setAllSongs(songsData);

        } catch (err) {
            console.error(err);
            alert("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSong = (song) => {
        // Allow duplicates in setlist? Usually yes for setlists (e.g. Encore same song? Rare but possible. Or medley parts)
        // But for simplicity, let's just add it.
        setCurrentSetlist([...currentSetlist, { ...song, tempId: Math.random() }]);
    };

    const handleRemoveSong = (index) => {
        const newList = [...currentSetlist];
        newList.splice(index, 1);
        setCurrentSetlist(newList);
    };

    const handleMove = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === currentSetlist.length - 1) return;

        const newList = [...currentSetlist];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
        setCurrentSetlist(newList);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            // Extract song IDs in order
            const songIds = currentSetlist.map(s => s.id);

            const res = await fetch(`http://localhost:4000/api/lives/${liveId}/setlist`, {
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

    // Filter songs for search
    const filteredSongs = allSongs.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit suggestion results

    if (isLoading) return <div className="p-4">Loading editor...</div>;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-lg">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Setlist Editor
                            <span className="text-sm font-normal text-slate-400 bg-slate-700 px-2 py-1 rounded">
                                {liveDate} {liveTitle}
                            </span>
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium transition-colors">
                            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Setlist'}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* LEFT: Current Setlist */}
                    <div className="flex-1 overflow-y-auto p-4 border-r border-slate-700">
                        <h3 className="text-slate-400 font-bold mb-4 uppercase text-xs tracking-wider">Current List ({currentSetlist.length} Songs)</h3>

                        {currentSetlist.length === 0 ? (
                            <div className="text-center py-20 text-slate-600 border-2 border-dashed border-slate-800 rounded-lg">
                                No songs in setlist yet.<br />Search and add songs from the right panel.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {currentSetlist.map((song, index) => (
                                    <div key={index} className="flex items-center gap-3 bg-slate-800 p-2 rounded border border-slate-700 group hover:border-blue-500/50 transition-colors">
                                        <div className="w-8 text-center font-mono text-slate-500 font-bold">{index + 1}</div>
                                        <div className="flex-1 font-medium text-slate-200">{song.title}</div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleMove(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 disabled:opacity-30"
                                            >
                                                <ArrowUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleMove(index, 'down')}
                                                disabled={index === currentSetlist.length - 1}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 disabled:opacity-30"
                                            >
                                                <ArrowDown size={16} />
                                            </button>
                                            <button onClick={() => handleRemoveSong(index)} className="p-1 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-400">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Song Selector */}
                    <div className="w-full md:w-80 bg-slate-800/50 p-4 flex flex-col border-l border-slate-700">
                        <h3 className="text-slate-400 font-bold mb-4 uppercase text-xs tracking-wider">Add Songs</h3>

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
                            {filteredSongs.map(song => (
                                <button
                                    key={song.id}
                                    onClick={() => handleAddSong(song)}
                                    className="w-full text-left px-3 py-2 rounded hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 text-sm flex justify-between group transition-colors"
                                >
                                    <span>{song.title}</span>
                                    <Plus size={16} className="opacity-0 group-hover:opacity-100" />
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <p className="text-xs text-slate-500 text-center">
                                Can't find a song?<br />Add it in the "Songs" tab first.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetlistEditor;
