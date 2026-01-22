import React, { useState } from 'react';
import { X, Check, AlertCircle, Upload, ArrowRight } from 'lucide-react';

const BulkImportModal = ({ onClose, onImport, allSongs }) => {
    const [rawText, setRawText] = useState('');
    const [parsedLines, setParsedLines] = useState([]);
    const [step, setStep] = useState(1); // 1: Input, 2: Review

    // Fuzzy match logic (simple includes for MVP) or use exact map
    const findMatch = (cleanLine) => {
        // 1. Direct match (case insensitive)
        const exactMatch = allSongs.find(s => s.title.toLowerCase() === cleanLine.toLowerCase());
        if (exactMatch) return { song: exactMatch, confidence: 'high' };

        // 2. Contains match (if line is slightly longer, e.g. "Song Name (Live)")
        // OR if song title is in the line
        const partialMatch = allSongs.find(s => cleanLine.toLowerCase().includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(cleanLine.toLowerCase()));
        if (partialMatch) return { song: partialMatch, confidence: 'medium' };

        return null;
    };

    const handleAnalyze = () => {
        const lines = rawText.split('\n').filter(line => line.trim() !== '');
        const results = lines.map((line, index) => {
            // Cleanup: Remove leading numbers like "1.", "01", "M1."
            let cleanLine = line.replace(/^([0-9]+[\.\s]*|M[0-9]+[\.\s]*)/i, '').trim();

            // Skip known noise words? No, allow SE/MC per user request
            // if (/^(SE|MC)$/i.test(cleanLine)) return null;

            const match = findMatch(cleanLine);
            return {
                original: line,
                clean: cleanLine,
                match: match,
                id: index
            };
        }).filter(Boolean); // Filter out nulls (noise)

        setParsedLines(results);
        setStep(2);
    };

    const handleConfirm = () => {
        // Collect only valid matches or manual overrides
        // For MVP, we pass back an array of song IDs or Titles?
        // AdminPage expects { sets: ... } or just a flat list? 
        // Existing handleImportToExistingLive uses flat list logic.
        // Let's return a list of song objects to the parent.

        const songsToImport = parsedLines.map(item => {
            if (item.match) return item.match.song;
            return null;
        }).filter(Boolean);

        onImport(songsToImport);
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

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1e293b] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-white/10 shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Upload size={20} className="text-blue-400" />
                        Bulk Import Setlist
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <p className="text-gray-400 text-sm">
                                Paste the full setlist text below. The system will automatically remove track numbers and attempt to match song titles.
                            </p>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="w-full h-96 bg-black/30 border border-white/10 rounded-lg p-4 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                                placeholder={`1. CHANCE!\n2. SHAMROCK\n3. 儚くも永久のカナシ\n...`}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                                <span>Original Text</span>
                                <span>Matched Song</span>
                            </div>
                            <div className="space-y-2">
                                {parsedLines.map((line) => (
                                    <div key={line.id} className="grid grid-cols-2 gap-4 items-center bg-black/20 p-3 rounded-lg border border-white/5">
                                        <div className="text-sm text-gray-300 truncate" title={line.original}>
                                            {line.original}
                                        </div>
                                        <div>
                                            {line.match ? (
                                                <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 px-2 py-1 rounded">
                                                    <Check size={14} />
                                                    <span className="truncate">{line.match.song.title}</span>
                                                    {line.match.confidence === 'manual' && <span className="text-xs text-blue-400">(Manual)</span>}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle size={14} className="text-yellow-500" />
                                                    <select
                                                        className="bg-[#0f172a] border border-white/20 rounded px-2 py-1 text-xs text-white w-full"
                                                        onChange={(e) => handleManualSelect(line.id, e.target.value)}
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>Select Song...</option>
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
                </div>

                <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                    {step === 1 ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/10 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleAnalyze}
                                disabled={!rawText.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Analyze Text <ArrowRight size={16} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/10 transition-colors">
                                Back to Edit
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-green-900/20"
                            >
                                <Check size={16} /> Confirm Import
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;
