import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertCircle, Upload, ArrowRight, Calendar, MapPin, List, Search, Plus, ListMusic } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import SetlistSortableItem from './SetlistSortableItem';
import SongSelector from './SongSelector';


const BulkImportModal = ({ onClose, onImport, allSongs, lives = [], initialText = '', initialLiveId = null }) => {
    const [rawText, setRawText] = useState(initialText);
    const [parsedLines, setParsedLines] = useState([]);
    const [step, setStep] = useState(1); // 1: Text Edit, 2: Song Matching, 3: Confirm & Live Selection
    const [selectedLiveId, setSelectedLiveId] = useState(initialLiveId || '');
    const [activeLineId, setActiveLineId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        setRawText(initialText);
    }, [initialText]);

    // ライブの自動提案ロジック
    useEffect(() => {
        if (!selectedLiveId && rawText && lives.length > 0) {
            // 1. 日付の抽出 (YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD)
            const dateMatch = rawText.match(/(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
            if (dateMatch) {
                const [_, y, m, d] = dateMatch;
                const formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                const foundLive = lives.find(l => l.date.substring(0, 10) === formattedDate);
                if (foundLive) {
                    setSelectedLiveId(foundLive.id);
                    return;
                }
            }

            // 2. 会場名のマッチング
            const foundByVenue = lives.find(l => rawText.includes(l.venue));
            if (foundByVenue) {
                setSelectedLiveId(foundByVenue.id);
            }
        }
    }, [rawText, lives, selectedLiveId]);

    // Fuzzy match logic
    const findMatch = (cleanLine) => {
        if (!cleanLine) return null;
        
        // 1. Direct match (case insensitive)
        const exactMatch = allSongs.find(s => s.title.toLowerCase() === cleanLine.toLowerCase());
        if (exactMatch) return { song: exactMatch, confidence: 'high' };

        // 2. Normalized match (remove spaces, symbols)
        const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9ぁ-んァ-ン一-龠]/g, '');
        const normLine = normalize(cleanLine);
        const normMatch = allSongs.find(s => normalize(s.title) === normLine);
        if (normMatch) return { song: normMatch, confidence: 'medium' };

        // 3. Partial match
        const partialMatch = allSongs.find(s => 
            cleanLine.toLowerCase().includes(s.title.toLowerCase()) || 
            s.title.toLowerCase().includes(cleanLine.toLowerCase())
        );
        if (partialMatch) return { song: partialMatch, confidence: 'low' };

        return null;
    };

    const handleParseText = () => {
        const lines = rawText.split('\n').filter(l => l.trim());
        const parsed = lines.map((line, index) => {
            const originalText = line.trim();
            
            // 検索用にクリーンアップ（行頭の番号、M1、アンコール、SEなどを無視）
            const cleanLine = originalText
                .replace(/^([0-9０-９]+[\.\s]*|M[0-9]+[\.\s]*|アンコール[:：]*|Encore[:：]*|SE[:：]*|MC[:：]*)\s*/i, '')
                .trim();

            // 楽曲リストの中からマッチするものを探す（完全一致 or クリーンアップ後の一致）
            const match = allSongs.find(s => {
                const title = s.title.toLowerCase();
                const ruby = s.ruby?.toLowerCase();
                const searchStr = cleanLine.toLowerCase();
                
                return title === searchStr || 
                       ruby === searchStr ||
                       (cleanLine.length > 2 && title.includes(searchStr)); // 部分一致も考慮
            });

            return {
                id: `line-${Date.now()}-${index}`,
                original: originalText,
                clean: cleanLine,
                match: match ? { song: match } : null
            };
        });

        setParsedLines(parsed);
        setStep(2);
        
        // 最初の手動選択をアシストするために、最初の未マッチ行をアクティブにする
        const firstUnmatched = parsed.find(l => !l.match);
        if (firstUnmatched) {
            setActiveLineId(firstUnmatched.id);
        } else if (parsed.length > 0) {
            setActiveLineId(parsed[0].id);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setParsedLines((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleMapSong = (song) => {
        if (activeLineId === null) return;
        setParsedLines(prev => prev.map(line => {
            if (line.id === activeLineId) {
                return { ...line, match: { song, confidence: 'manual' } };
            }
            return line;
        }));
        
        // 自動的に次の行へ進む（UX向上）
        const currentIndex = parsedLines.findIndex(l => l.id === activeLineId);
        if (currentIndex < parsedLines.length - 1) {
            setActiveLineId(parsedLines[currentIndex + 1].id);
        }
    };

    const handleConfirmSelection = () => {
        setStep(3);
    };

    const handleFinalImport = () => {
        if (!selectedLiveId) return;

        // Commit API用のデータ形式に整形
        const setlistData = parsedLines
            .filter(item => {
                const song = item.match?.song;
                return !!song || !!item.clean;
            })
            .map((item, index) => {
                const song = item.match?.song;
                return {
                    songId: song?.id || null,
                    title: song?.title || item.clean, // songIdがない場合はタイトルで新規登録
                    position: index + 1
                };
            });

        onImport(selectedLiveId, setlistData);
    };

    const handleManualSelect = (lineId, songId) => {
        const selectedSong = allSongs.find(s => s.id === parseInt(songId));
        setParsedLines(prev => prev.map(line => {
            if (line.id === lineId) {
                return { ...line, match: { song: selectedSong, confidence: 'manual' } };
            }
            return line;
        }));
    };

    const handleRemoveLine = (lineId) => {
        setParsedLines(prev => prev.filter(l => l.id !== lineId));
        if (activeLineId === lineId) setActiveLineId(null);
    };

    const filteredSongs = useMemo(() => {
        if (!searchTerm) return [];
        return allSongs.filter(s => 
            s.title.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 10);
    }, [allSongs, searchTerm]);

    const selectedLive = useMemo(() => 
        lives.find(l => l.id === parseInt(selectedLiveId)),
        [selectedLiveId, lives]
    );

    // 重複チェック (既にセットリストがあるか)
    const hasExistingSetlist = (selectedLive?.setlist?.length || 0) > 0;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1e293b] rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-white/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Upload size={20} className="text-blue-400" />
                            画像セットリスト取り込み
                        </h3>
                        <div className="flex gap-4 mt-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`flex items-center gap-1.5 text-xs font-medium ${step === i ? 'text-blue-400' : 'text-gray-500'}`}>
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === i ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600'}`}>
                                        {i}
                                    </span>
                                    {i === 1 ? 'テキスト修正' : i === 2 ? '曲マッチング' : '最終確認'}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-black/5">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex gap-3 text-sm text-blue-200">
                                <AlertCircle size={18} className="shrink-0" />
                                <p>OCRで読み取ったテキストを確認・修正してください。1行に1曲の形式にします。</p>
                            </div>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="w-full h-96 bg-black/30 border border-white/10 rounded-lg p-4 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none leading-relaxed"
                                placeholder={`1. CHANCE!\n2. SHAMROCK\n3. 儚くも永久のカナシ\n...`}
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col md:flex-row gap-4 h-[65vh]">
                            {/* LEFT: Mapping List */}
                            <div className="flex-1 overflow-y-auto pr-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">楽曲紐付けリスト</h3>
                                    <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">
                                        {parsedLines.length} 行
                                    </span>
                                </div>
                                
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={parsedLines.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-2">
                                            {parsedLines.map((line, index) => (
                                                <SetlistSortableItem
                                                    key={line.id}
                                                    id={line.id}
                                                    song={line.match?.song}
                                                    index={index}
                                                    isActive={activeLineId === line.id}
                                                    onEditStart={() => setActiveLineId(line.id)}
                                                    onRemove={() => handleRemoveLine(line.id)}
                                                    onClear={() => handleManualSelect(line.id, null)}
                                                    originalText={line.original}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>

                            {/* RIGHT: Song Selector */}
                            <SongSelector
                                songs={filteredSongs}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                onSelect={handleMapSong}
                                isEditing={true}
                                editingIndex={parsedLines.findIndex(l => l.id === activeLineId)}
                                placeholder="紐付ける曲を検索..."
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            {/* Live Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                    <Calendar size={16} /> 登録先のライブを選択
                                </label>
                                <select
                                    value={selectedLiveId}
                                    onChange={(e) => setSelectedLiveId(e.target.value)}
                                    className={`w-full bg-black/40 border ${selectedLiveId ? 'border-blue-500/50' : 'border-red-500/50'} rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                                >
                                    <option value="">ライブを選択してください...</option>
                                    {lives.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.date.substring(0, 10)} - {l.venue} ({l.title || 'ONEMAN'})
                                        </option>
                                    ))}
                                </select>
                                
                                {selectedLive && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">会場</span>
                                            <div className="flex items-center gap-2 text-sm text-white">
                                                <MapPin size={14} className="text-blue-400" />
                                                {selectedLive.venue}
                                            </div>
                                        </div>
                                            <div className="flex items-center gap-2 text-sm text-white font-mono">
                                                <List size={14} className="text-gray-400" />
                                                {selectedLive.setlist?.length || 0} 曲
                                            </div>
                                    </div>
                                )}

                                {hasExistingSetlist && (
                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3 text-sm text-red-300">
                                        <AlertCircle size={18} className="shrink-0" />
                                        <p>Warning: このライブには既にセットリストが登録されています。確定すると現在のデータは上書きされます。</p>
                                    </div>
                                )}
                            </div>

                            {/* Summary Preview */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                    <Check size={16} /> 登録内容プレビュー ({parsedLines.length}曲)
                                </label>
                                <div className="bg-black/30 rounded-lg p-4 border border-white/5 max-h-60 overflow-y-auto">
                                    <div className="space-y-1.5">
                                        {parsedLines.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-sm">
                                                <span className="text-gray-600 font-mono w-4">{idx + 1}.</span>
                                                <span className={item.match ? 'text-gray-300' : 'text-blue-400 font-medium'}>
                                                    {item.match?.song.title || item.clean}
                                                </span>
                                                {!item.match && <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-400 leading-none">NEW</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-black/20 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        {step === 2 && `${parsedLines.filter(l => l.match).length}/${parsedLines.length} 曲マッチ済み`}
                    </div>
                    <div className="flex gap-3">
                        {step > 1 && (
                            <button 
                                onClick={() => setStep(step - 1)} 
                                className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/10 transition-colors text-sm font-medium"
                            >
                                戻る
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/10 transition-colors text-sm font-medium"
                        >
                            キャンセル
                        </button>
                        
                        {step === 1 && (
                            <button
                                onClick={handleParseText}
                                disabled={!rawText.trim()}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 font-bold"
                            >
                                解析して次へ <ArrowRight size={18} />
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                onClick={handleConfirmSelection}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 font-bold"
                            >
                                最終確認へ <ArrowRight size={18} />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                onClick={handleFinalImport}
                                disabled={!selectedLiveId}
                                className={`px-6 py-2 ${hasExistingSetlist ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-bold`}
                            >
                                <Check size={18} /> {hasExistingSetlist ? '上書きして確定' : 'セットリストを確定'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;
