import React, { useState, useEffect } from 'react';
import type { Song } from '../types/api';
import { useNavigate, Link, useSearchParams, useParams } from 'react-router-dom';
import { useSongs, useSearchSongs } from '../hooks/queries/useSongs';
import { useLiveDetail, useLives } from '../hooks/queries/useLives';
import { useCreatePrediction, useUpdatePrediction, usePredictionDetail } from '../hooks/queries/usePredictions';
import { useToast } from '../contexts/ToastContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Search, Plus, Save, AlertCircle } from 'lucide-react';
import PageHeader from '../components/Layout/PageHeader';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { SortableSongItem } from '../components/SortableSongItem';
import { DISCOGRAPHY } from '../data/discography';

const SetlistPredictionCreate = () => {
    const { id: editId } = useParams();
    const isEdit = !!editId;
    const [selectedSongs, setSelectedSongs] = useState<{ uniqueId: string; song: Song }[]>([]);
    const [title, setTitle] = useState('セットリスト予想');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null);
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams] = useSearchParams();
    const liveIdFromQuery = searchParams.get('live_id');

    const { data: allSongs = [] } = useSongs();
    
    // 編集モード：既存データの取得
    const { data: existingPrediction, isLoading: isLoadingPrediction } = usePredictionDetail(editId);

    // 編集モード：初期データのセット
    useEffect(() => {
        if (isEdit && existingPrediction && allSongs.length > 0) {
            setSelectedLiveId(String(existingPrediction.live_id));
            setTitle(existingPrediction.title || 'セットリスト予想');
            
            if (existingPrediction.songs) {
                const songsWithUniqueIds = existingPrediction.songs.map(ps => {
                    const songData = allSongs.find(s => s.id === ps.id);
                    return {
                        uniqueId: `list-item-${ps.id}-${Math.random().toString(36).substr(2, 9)}`,
                        song: songData || { id: ps.id, title: ps.title } as Song
                    };
                });
                setSelectedSongs(songsWithUniqueIds);
            }
        }
    }, [isEdit, existingPrediction, allSongs]);

    // Debounce searchQuery
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data: searchResults = [] } = useSearchSongs(debouncedQuery);

    // selectedLiveId が変更された場合はそちらの詳細を表示する
    const { data: liveInfo = null } = useLiveDetail(selectedLiveId ?? liveIdFromQuery ?? undefined);
    const { data: tourLives = [] } = useLives({
        tour_name: liveInfo?.tour_name,
        enabled: !!liveInfo?.tour_name,
    });
    
    const createPrediction = useCreatePrediction();
    const updatePrediction = useUpdatePrediction(editId || '');

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

    // liveIdFromQuery が変わったら selectedLiveId も同期（新規作成時のみ）
    useEffect(() => {
        if (liveIdFromQuery && !isEdit) setSelectedLiveId(liveIdFromQuery);
    }, [liveIdFromQuery, isEdit]);

    // 過去のライブや、予想開始日以前のライブへの投稿を制限
    useEffect(() => {
        if (liveInfo && !isEdit) {
            const liveDate = new Date(liveInfo.date.split('T')[0].replace(/-/g, '/'));
            const PREDICTION_START_DATE = new Date('2026/05/01');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPastLive = liveDate < today;

            if (liveDate < PREDICTION_START_DATE) {
                showToast("このライブは予想対象外です", "warning");
                navigate('/predictions');
            } else if (isPastLive) {
                showToast("開催済みのライブには投稿できません", "info");
                navigate(`/predictions?live_id=${liveInfo.id}`);
            }
        }
    }, [liveInfo, isEdit, navigate, showToast]);

    // 編集モードでの締切チェック
    useEffect(() => {
        if (isEdit && existingPrediction?.is_closed) {
            showToast("締切済みの予想は編集できません", "warning");
            navigate(`/predictions/${editId}`);
        }
    }, [isEdit, existingPrediction, editId, navigate, showToast]);

    const handleAddSong = (song: Song) => {
        if (selectedSongs.length >= 30) {
            showToast("予想曲は最大30曲までです", "warning");
            return;
        }
        // 重複チェック（フロントエンドでも実施）
        if (selectedSongs.some(s => s.song.id === song.id)) {
            showToast("同じ曲がすでに含まれています", "warning");
            return;
        }

        const newEntry = {
            uniqueId: `list-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            song: song
        };
        setSelectedSongs([...selectedSongs, newEntry]);
        setSearchQuery('');
    };

    const handleSelectSong = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const songId = parseInt(e.target.value, 10);
        if (!songId) return;

        const song = allSongs.find(s => s.id === songId);
        if (song) {
            handleAddSong(song);
        }
        e.target.value = ""; // Reset selection
    };

    const handleRemoveSong = (uniqueId: string) => {
        setSelectedSongs(selectedSongs.filter(s => s.uniqueId !== uniqueId));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSelectedSongs((items) => {
                const oldIndex = items.findIndex((item) => item.uniqueId === active.id);
                const newIndex = items.findIndex((item) => item.uniqueId === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        
        if (!selectedLiveId) {
            showToast("対象のライブを選択してください", "warning");
            return;
        }

        if (selectedSongs.length === 0) {
            showToast("1曲以上の楽曲を選択してください", "warning");
            return;
        }

        if (!title.trim()) {
            showToast("タイトルを入力してください", "warning");
            return;
        }

        const payload = {
            title: title.trim(),
            songs: selectedSongs.map(s => s.song.id),
            live_id: parseInt(selectedLiveId),
        };

        if (isEdit) {
            updatePrediction.mutate(payload, {
                onSuccess: (data) => {
                    showToast("予想を更新しました", "success");
                    navigate(`/predictions/${data.id}`);
                },
                onError: (error: any) => {
                    console.error('Update error:', error);
                    showToast("更新に失敗しました", "error");
                }
            });
        } else {
            createPrediction.mutate(payload, {
                onSuccess: (data) => {
                    showToast("予想を公開しました！", "success");
                    navigate(`/predictions/${data.id}`);
                },
                onError: (error: any) => {
                    if (error.status === 409) {
                        const existingId = error.data?.prediction_id;
                        if (window.confirm("このライブにはすでに予想を投稿済みです。\n既存の予想を編集しますか？")) {
                            navigate(existingId ? `/predictions/edit/${existingId}` : '/predictions');
                        }
                    } else {
                        showToast("保存に失敗しました", "error");
                    }
                },
            });
        }
    };

    if (!currentUser) return null;

    if (isEdit && isLoadingPrediction) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-blue-400 font-bold animate-pulse">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in" style={{ paddingTop: '100px', paddingBottom: '80px' }}>
            <SEO title={isEdit ? "予想を編集" : "セトリ予想を作成"} description="UVERworldのライブのセトリを予想して公開しましょう。" />
            <div className="max-w-4xl mx-auto px-4">
                <PageHeader 
                    title={isEdit ? "予想を編集" : "予想を作成"} 
                    subtitle={isEdit ? "投稿済みの予想をブラッシュアップ" : "新しいセトリ予想を作成"} 
                    rightElement={null} 
                />

                {/* 予想タイトル入力 */}
                <div className="mt-6 mb-4">
                    <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 ml-1">
                        予想のタイトル
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例: 横アリ2日目の理想のセトリ"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 text-white text-lg font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-lg placeholder:text-slate-600"
                        maxLength={50}
                    />
                </div>

                {/* ライブ情報表示 */}
                {liveInfo && (
                    <div className="mt-4 bg-slate-800/50 border border-yellow-500/30 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <span className="text-yellow-400 text-lg shrink-0 mt-0.5">🎤</span>
                            <div>
                                <div className="text-white font-bold leading-tight mb-1">{liveInfo.tour_name || 'スペシャルライブ'}</div>
                                <div className="text-sm text-slate-400">
                                    {liveInfo.date ? liveInfo.date.split('T')[0] : ''} @ {liveInfo.venue}
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
                                    onChange={(e) => setSelectedLiveId(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer flex-1 min-w-0"
                                >
                                    {tourLives.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.date ? l.date.split('T')[0] : ''} @ {l.venue}
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
                                        const availableSongs = release.songs
                                            .map(songTitle => allSongs.find(s => s.title === songTitle))
                                            .filter((s): s is Song => s !== undefined);

                                        if (availableSongs.length === 0) return null;

                                        return (
                                            <optgroup key={`release-${index}`} label={`[${release.type}] ${release.title}`}>
                                                {availableSongs.map(song => (
                                                    <option key={`opt-${song.id}`} value={song.id}>{song.title}</option>
                                                ))}
                                            </optgroup>
                                        );
                                    })}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                </div>
                            </div>

                            {/* Search Results Dropdown */}
                            {(() => {
                                // Collect all song titles mentioned in DISCOGRAPHY
                                const discoSongs = new Set();
                                DISCOGRAPHY.forEach(r => r.songs.forEach(s => discoSongs.add(s)));

                                // Filter search results to only show songs in the discography
                                const filteredSearchResults = searchResults.filter(song => discoSongs.has(song.title));

                                if (filteredSearchResults.length > 0 && searchQuery.length > 0) {
                                    return (
                                        <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            {filteredSearchResults.map(song => (
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
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={createPrediction.isPending || updatePrediction.isPending || selectedSongs.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                        >
                            {(createPrediction.isPending || updatePrediction.isPending) ? '保存中...' : (
                                <><Save size={20} /> {isEdit ? '予想を更新する' : '予想を保存して公開する'}</>
                            )}
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
