import React, { useState, useEffect } from 'react';
import { Music, Check, Loader2, ExternalLink, AlertCircle, History } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

interface SpotifyPlaylistButtonProps {
    liveId: number;
}

interface HistoryEntry {
    playlistUrl: string;
    createdAt: string;
}

const authHeaders = () => ({
    headers: { token: localStorage.getItem('token') || '' },
});

const SpotifyPlaylistButton: React.FC<SpotifyPlaylistButtonProps> = ({ liveId }) => {
    const { currentUser } = useAuth();
    const [status, setStatus] = useState<'IDLE' | 'LINKING' | 'CREATING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [isLinked, setIsLinked] = useState(false);
    const [result, setResult] = useState<{
        playlistUrl: string;
        total: number;
        added: number;
        missing: string[];
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        if (currentUser) {
            checkStatus();
            fetchHistory();
        }
    }, [currentUser]);

    const checkStatus = async () => {
        try {
            const res = await axios.get('/api/spotify/status', authHeaders());
            setIsLinked(res.data.linked);
        } catch (err) {
            console.error('Failed to check Spotify status');
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`/api/spotify/history/${liveId}`, authHeaders());
            setHistory(res.data);
        } catch (err) {
            // 履歴取得失敗は無視
        }
    };

    const handleLink = async () => {
        setError(null);
        try {
            const res = await axios.get('/api/spotify/auth-url', authHeaders());
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                res.data.url,
                'Spotify Login',
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
            );

            const timer = setInterval(() => {
                if (!popup || popup.closed) {
                    clearInterval(timer);
                    checkStatus();
                }
            }, 1000);
        } catch (err) {
            setError('連携URLの取得に失敗しました。');
        }
    };

    const handleCreate = async () => {
        if (status === 'CREATING') return;

        setStatus('CREATING');
        setError(null);
        try {
            const res = await axios.post('/api/spotify/create-playlist', { liveId }, authHeaders());
            setResult(res.data);
            setStatus('SUCCESS');
            fetchHistory();
        } catch (err: any) {
            setStatus('ERROR');
            setError(err.response?.data?.message || 'プレイリストの作成に失敗しました。');
        }
    };

    if (!currentUser) return null;

    if (status === 'SUCCESS' && result) {
        return (
            <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 text-emerald-400 font-black mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check size={20} />
                    </div>
                    <div>
                        <div className="text-base">プレイリストを作成しました！</div>
                        <div className="text-[10px] font-mono opacity-60 uppercase tracking-widest">SPOTIFY PLAYLIST CREATED</div>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-400">追加済み楽曲</span>
                            <span className="text-white font-bold">{result.added} / {result.total}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full transition-all duration-1000 ease-out"
                                style={{ width: `${(result.added / result.total) * 100}%` }}
                            />
                        </div>
                    </div>

                    {result.missing.length > 0 && (
                        <div className="px-4 py-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <AlertCircle size={10} /> Not Found on Spotify
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                {result.missing.join(', ')} は見つかりませんでした。
                            </p>
                        </div>
                    )}
                </div>

                <a
                    href={result.playlistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#1DB954] text-black font-black hover:bg-[#1ed760] transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-[#1DB954]/10 group"
                >
                    Spotifyで開く
                    <ExternalLink size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Music size={12} className="text-[#1DB954]" />
                        Spotify Connection
                    </h3>
                </div>
                {isLinked && (
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        LINKED
                    </span>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs justify-center bg-red-400/5 py-2 rounded-lg border border-red-400/10 mb-3">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            {!isLinked ? (
                <button
                    onClick={handleLink}
                    className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-3 transition-all group"
                >
                    <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center text-black">
                        <Music size={16} fill="currentColor" />
                    </div>
                    Spotifyと連携してプレイリスト作成
                </button>
            ) : (
                <div className="space-y-4">
                    <button
                        onClick={handleCreate}
                        disabled={status === 'CREATING'}
                        className={`w-full py-5 rounded-3xl bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-black font-black flex items-center justify-center gap-3 transition-all relative overflow-hidden group shadow-lg shadow-[#1DB954]/20
                            ${status === 'CREATING' ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
                    >
                        {status === 'CREATING' ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span className="tracking-wide">作成中...</span>
                            </>
                        ) : (
                            <>
                                <Music size={20} fill="currentColor" className="group-hover:rotate-12 transition-transform" />
                                <span className="tracking-wide">Spotifyプレイリストを作成</span>
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-slate-500 font-medium">
                        ※ ライブラリに「非公開プレイリスト」として保存されます。
                    </p>
                </div>
            )}

            {history.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        <History size={10} />
                        過去に作成したプレイリスト
                    </div>
                    <div className="space-y-1.5">
                        {history.map((entry, i) => (
                            <a
                                key={i}
                                href={entry.playlistUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-[#1DB954]/30 transition-all group"
                            >
                                <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">
                                    {new Date(entry.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 作成
                                </span>
                                <ExternalLink size={11} className="text-slate-600 group-hover:text-[#1DB954] transition-colors shrink-0" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpotifyPlaylistButton;
