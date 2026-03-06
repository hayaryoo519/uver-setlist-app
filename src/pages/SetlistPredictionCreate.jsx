import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Search, Plus, Save } from 'lucide-react';
import PageHeader from '../components/Layout/PageHeader';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { SortableSongItem } from '../components/SortableSongItem';
import { DISCOGRAPHY } from '../data/discography';

const SetlistPredictionCreate = () => {
    const [selectedSongs, setSelectedSongs] = useState([]); // [{ uniqueId: '...', song: { id: 1, title: '...' } }]
    const [allSongs, setAllSongs] = useState([]); // Array of all songs for the select box
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [liveInfo, setLiveInfo] = useState(null); // ライブ情報
    const [tourLives, setTourLives] = useState([]); // 同じツアーのライブ一覧
    const [selectedLiveId, setSelectedLiveId] = useState(null); // 選択中のライブID
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const liveId = searchParams.get('live_id');

    // Dnd-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // minimum drag distance before turning into drag
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Initial check for Auth
    useEffect(() => {
        if (!currentUser) {
            alert("ログインが必要です");
            navigate('/login', { state: { from: location.pathname + location.search } });
        } else {
            fetchAllSongs();
            // ライブ情報を取得
            if (liveId) {
                setSelectedLiveId(liveId);
                fetchLiveInfo(liveId);
            }
        }
    }, [currentUser, navigate, location, liveId]);

    const fetchLiveInfo = async (id) => {
        try {
            const res = await fetch(`/api/lives/${id}`);
            if (res.ok) {
                const data = await res.json();
                setLiveInfo(data);

                // 同じツアーの別日程を取得
                if (data.tour_name) {
                    const tourRes = await fetch(`/api/lives?tour_name=${encodeURIComponent(data.tour_name)}`);
                    if (tourRes.ok) {
                        const tourData = await tourRes.json();
                        // サーバー側でツアー名完全一致済み。日付順にソートしてセット
                        tourData.sort((a, b) => new Date(a.date) - new Date(b.date));
                        setTourLives(tourData);
                    }
                }
            }
        } catch (err) {
            console.error('Fetch live info failed:', err);
        }
    };

    const fetchAllSongs = async () => {
        try {
            const res = await fetch('/api/songs'); // Assuming this returns all songs if no 'q' is provided
            if (res.ok) {
                const data = await res.json();
                // Optionally sort songs by title alphabetically or id
                data.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
                setAllSongs(data);
            }
        } catch (err) {
            console.error('Fetch all songs failed:', err);
        }
    };

    // Search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length > 0) {
                fetchSongs(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 300); // debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchSongs = async (q) => {
        try {
            const res = await fetch(`/api/songs?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            }
        } catch (err) {
            console.error('Fetch songs failed:', err);
        }
    };

    const handleAddSong = (song) => {
        // Create a unique ID for the list item because same song can be added twice
        const newEntry = {
            uniqueId: `list-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            song: song
        };
        setSelectedSongs([...selectedSongs, newEntry]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSelectSong = (e) => {
        const songId = parseInt(e.target.value, 10);
        if (!songId) return;

        const song = allSongs.find(s => s.id === songId);
        if (song) {
            handleAddSong(song);
        }
        e.target.value = ""; // Reset selection
    };

    const handleRemoveSong = (uniqueId) => {
        setSelectedSongs(selectedSongs.filter(s => s.uniqueId !== uniqueId));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSelectedSongs((items) => {
                const oldIndex = items.findIndex((item) => item.uniqueId === active.id);
                const newIndex = items.findIndex((item) => item.uniqueId === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedSongs.length === 0) {
            alert("1曲以上の楽曲を選択してください。");
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/predictions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({
                    title: 'セットリスト予想',
                    songs: selectedSongs.map(s => s.song.id),
                    live_id: selectedLiveId ? parseInt(selectedLiveId) : null
                })
            });

            if (res.ok) {
                const data = await res.json();
                navigate(`/predictions/${data.id}`);
            } else {
                alert("予想の保存に失敗しました。");
            }
        } catch (error) {
            console.error('Save prediction failed:', error);
            alert("予期せぬエラーが発生しました。");
        } finally {
            setIsSaving(false);
        }
    };

    if (!currentUser) return null;

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in" style={{ paddingTop: '100px', paddingBottom: '80px' }}>
            <SEO title="セトリ予想を作成" />
            <div className="max-w-4xl mx-auto px-4">
                <PageHeader title="CREATE PREDICTION" subtitle="新しいセトリ予想を作成" />

                {/* ライブ情報表示 */}
                {liveInfo && (
                    <div className="mt-4 bg-slate-800/50 border border-yellow-500/30 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <span className="text-yellow-400 text-lg shrink-0 mt-0.5">🎤</span>
                            <div>
                                <div className="text-white font-bold leading-tight mb-1">{liveInfo.tour_name || 'Special Live'}</div>
                                <div className="text-sm text-slate-400">
                                    {liveInfo.date ? new Date(liveInfo.date).toISOString().split('T')[0] : ''} @ {liveInfo.venue}
                                </div>
                            </div>
                        </div>

                        {/* ツアー日程選択ドロップダウン */}
                        {tourLives.length > 1 && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                <label className="text-xs font-medium text-slate-400 whitespace-nowrap">
                                    対象公演を変更:
                                </label>
                                <select
                                    value={selectedLiveId || ''}
                                    onChange={(e) => {
                                        const newId = e.target.value;
                                        setSelectedLiveId(newId);
                                        // 選択したライブの情報に更新（UI表示用）
                                        const selected = tourLives.find(l => l.id.toString() === newId);
                                        if (selected) setLiveInfo(selected);
                                    }}
                                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer flex-1 min-w-0"
                                >
                                    {tourLives.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.date ? new Date(l.date).toISOString().split('T')[0] : ''} @ {l.venue}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {/* Left: Search & Form */}
                    <div className="space-y-6">

                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 relative">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                楽曲を追加
                            </label>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="曲名で検索 (フリーワード)..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="relative">
                                <select
                                    onChange={handleSelectSong}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                                    defaultValue=""
                                >
                                    <option value="" disabled>一覧から曲を選択...</option>

                                    {/* Group by DISCOGRAPHY releases */}
                                    {DISCOGRAPHY.slice().reverse().map((release, index) => {
                                        // Filter songs that exist in the database (allSongs)
                                        const availableSongs = release.songs.map(songTitle => {
                                            // Find the song in allSongs by exact title
                                            return allSongs.find(s => s.title === songTitle);
                                        }).filter(Boolean); // Keep only found songs

                                        if (availableSongs.length === 0) return null;

                                        return (
                                            <optgroup key={`release-${index}`} label={`[${release.type}] ${release.title}`}>
                                                {availableSongs.map(song => (
                                                    <option key={`opt-${song.id}`} value={song.id}>{song.title}</option>
                                                ))}
                                            </optgroup>
                                        );
                                    })}

                                    {/* "Other" category for songs not in DISCOGRAPHY */}
                                    {(() => {
                                        // Collect all song titles mentioned in DISCOGRAPHY
                                        const discoSongs = new Set();
                                        DISCOGRAPHY.forEach(r => r.songs.forEach(s => discoSongs.add(s)));

                                        // Find songs in allSongs that are not in the discography
                                        const otherSongs = allSongs.filter(s => !discoSongs.has(s.title));

                                        if (otherSongs.length === 0) return null;

                                        return (
                                            <optgroup label="その他">
                                                {otherSongs.map(song => (
                                                    <option key={`opt-other-${song.id}`} value={song.id}>{song.title}</option>
                                                ))}
                                            </optgroup>
                                        );
                                    })()}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                </div>
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && searchQuery.length > 0 && (
                                <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {searchResults.map(song => (
                                        <button
                                            key={song.id}
                                            onClick={() => handleAddSong(song)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-700/50 border-b border-slate-700/50 last:border-0 flex items-center justify-between group transition-colors"
                                        >
                                            <span className="text-white font-medium">{song.title}</span>
                                            <Plus size={16} className="text-slate-500 group-hover:text-blue-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSaving || selectedSongs.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                        >
                            {isSaving ? '保存中...' : <><Save size={20} /> 予想を保存して公開する</>}
                        </button>
                    </div>

                    {/* Right: Selected Songs List (Drag & Drop) */}
                    <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span>セットリスト</span>
                            <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                                {selectedSongs.length}曲
                            </span>
                        </h3>

                        {selectedSongs.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                                検索して楽曲を追加してください
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={selectedSongs.map(s => s.uniqueId)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-1">
                                        {selectedSongs.map((item, index) => (
                                            <SortableSongItem
                                                key={item.uniqueId}
                                                id={item.uniqueId}
                                                song={item.song}
                                                index={index}
                                                onRemove={handleRemoveSong}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </div>

                {/* ナビゲーションボタン */}
                <div className="mt-8 flex justify-center">
                    <Link
                        to="/predictions"
                        className="flex items-center gap-2 text-slate-400 hover:text-purple-300 font-medium transition-colors"
                        style={{ textDecoration: 'none' }}
                    >
                        👀 みんなの予想を見る
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SetlistPredictionCreate;
