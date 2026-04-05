import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertCircle, Upload, ArrowRight, Calendar, MapPin, List } from 'lucide-react';

const BulkImportModal = ({ onClose, onImport, allSongs, lives = [], initialText = '', initialLiveId = null }) => {
    const [rawText, setRawText] = useState(initialText);
    const [parsedLines, setParsedLines] = useState([]);
    const [step, setStep] = useState(1); // 1: Text Edit, 2: Song Matching, 3: Confirm & Live Selection
    const [selectedLiveId, setSelectedLiveId] = useState(initialLiveId || '');

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

    const handleAnalyze = () => {
        const lines = rawText.split('\n').filter(line => line.trim() !== '');
        const results = lines.map((line, index) => {
            // Cleanup: Remove leading numbers like "1.", "01", "M1."
            let cleanLine = line.replace(/^([0-9]+[\.\s]*|M[0-9]+[\.\s]*|アンコール[:：]*|Encore[:：]*)/i, '').trim();

            const match = findMatch(cleanLine);
            return {
                original: line,
                clean: cleanLine,
                match: match,
                id: index
            };
        });

        setParsedLines(results);
        setStep(2);
    };

    const handleConfirmSelection = () => {
        setStep(3);
    };

    const handleFinalImport = () => {
        if (!selectedLiveId) return;

        // Commit API用のデータ形式に整形
        const setlistData = parsedLines
            .map((item, index) => {
                const song = item.match?.song;
                if (!song && !item.clean) return null;
                
                return {
                    songId: song?.id || null,
                    title: song?.title || item.clean, // songIdがない場合はタイトルで新規登録
                    position: index + 1
                };
            })
            .filter(Boolean);

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
                        <div className="space-y-4">
                            <div className="grid grid-cols-[1fr,1.2fr] gap-4 text-xs font-bold text-gray-500 uppercase px-3">
                                <span>読み取りテキスト</span>
                                <span>紐付け先の曲</span>
                            </div>
                            <div className="space-y-2">
                                {parsedLines.map((line) => (
                                    <div key={line.id} className="grid grid-cols-[1fr,1.2fr] gap-4 items-center bg-black/20 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="text-sm text-gray-300 truncate" title={line.original}>
                                            {line.original}
                                        </div>
                                        <div>
                                            {line.match ? (
                                                <div className="flex items-center justify-between gap-2 text-green-400 text-sm bg-green-500/10 px-3 py-1.5 rounded-md border border-green-500/20">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Check size={14} className="shrink-0" />
                                                        <span className="truncate">{line.match.song.title}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleManualSelect(line.id, null)}
                                                        className="text-[10px] text-gray-400 hover:text-red-400"
                                                    >
                                                        解除
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="bg-[#0f172a] border border-white/20 rounded-md px-3 py-1.5 text-xs text-white w-full focus:border-blue-500 outline-none"
                                                        onChange={(e) => handleManualSelect(line.id, e.target.value)}
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>曲を選択...</option>
                                                        <option value="new">-- 新規作成 (テキストで登録) --</option>
                                                        {allSongs.map(s => (
                                                            <option key={s.id} value={s.id}>{s.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                onClick={handleAnalyze}
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
