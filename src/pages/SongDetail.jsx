import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Music, Calendar, MapPin, Play, Clock, ArrowLeft, Loader } from 'lucide-react';
import SEO from '../components/SEO';

const SongDetail = () => {
    const { id } = useParams();
    const [song, setSong] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSong = async () => {
            try {
                const res = await fetch(`/api/songs/${id}/stats`);
                if (res.ok) {
                    const data = await res.json();
                    setSong(data);
                } else {
                    console.error("Failed to fetch song");
                }
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSong();
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900">
                <Loader className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    if (!song) {
        return (
            <div className="min-h-screen bg-slate-900 flex justify-center items-center text-white">
                Song not found.
            </div>
        );
    }

    const playCount = song.performances.length;
    const lastPlayed = playCount > 0 ? new Date(song.performances[0].date) : null;
    const firstPlayed = playCount > 0 ? new Date(song.performances[playCount - 1].date) : null;

    // Calculate "days since last played"
    const now = new Date();
    const daysSince = lastPlayed ? Math.floor((now - lastPlayed) / (1000 * 60 * 60 * 24)) : null;

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
            <SEO title={`${song.title} - Song Stats`} description={`Performance history of ${song.title} by UVERworld.`} />

            <div className="max-w-4xl mx-auto px-4">
                <Link to="/lives" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft size={18} className="mr-2" /> Back to Archives
                </Link>

                {/* Header */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 text-blue-400 mb-2 font-mono text-sm">
                            <Music size={16} />
                            <span>SONG ANALYTICS</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold font-oswald mb-4">{song.title}</h1>

                        <div className="flex flex-wrap gap-6 text-slate-300">
                            {song.album && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-xs uppercase tracking-wider">ALBUM</span>
                                    <span>{song.album}</span>
                                </div>
                            )}
                            {song.release_year && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-xs uppercase tracking-wider">YEAR</span>
                                    <span>{song.release_year}</span>
                                </div>
                            )}
                            {song.author && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-xs uppercase tracking-wider">AUTHOR</span>
                                    <span>{song.author}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                            <Play size={14} /> Total Plays
                        </div>
                        <div className="text-3xl font-bold text-white">{playCount} <span className="text-sm font-normal text-slate-500">times</span></div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                            <Clock size={14} /> Last Played
                        </div>
                        <div className="text-lg font-bold text-white">
                            {lastPlayed ? lastPlayed.toISOString().split('T')[0] : 'Never'}
                        </div>
                        {daysSince !== null && (
                            <div className="text-xs text-blue-400 mt-1">{daysSince} days ago</div>
                        )}
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700/50">
                        <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                            <Calendar size={14} /> First Played
                        </div>
                        <div className="text-lg font-bold text-white">
                            {firstPlayed ? firstPlayed.toISOString().split('T')[0] : 'Never'}
                        </div>
                    </div>
                </div>

                {/* Performance History */}
                <h2 className="text-2xl font-bold font-oswald mb-4 border-l-4 border-blue-500 pl-4">PERFORMANCE HISTORY</h2>

                <div className="space-y-2">
                    {song.performances.length === 0 ? (
                        <div className="text-slate-500 italic">No performance data available.</div>
                    ) : (
                        song.performances.map((live) => (
                            <Link to={`/live/${live.id}`} key={live.id} className="block group">
                                <div className="bg-slate-800/40 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 transition-colors flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mb-1">
                                            <span className="font-mono">{new Date(live.date).toISOString().split('T')[0]}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded ${live.type === 'FESTIVAL' ? 'bg-purple-900 text-purple-200' :
                                                live.type === 'EVENT' ? 'bg-orange-900 text-orange-200' :
                                                    live.type === 'ARENA' ? 'bg-blue-900 text-blue-200' : // Arena specific
                                                        'bg-emerald-900 text-white'
                                                }`}>
                                                {live.type || 'ONEMAN'}
                                            </span>
                                        </div>
                                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                                            {live.tour_name}
                                        </div>
                                        <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                            <MapPin size={12} /> {live.venue}
                                        </div>
                                    </div>
                                    <div className="text-slate-600 group-hover:text-white">
                                        <ArrowLeft size={16} className="rotate-180" />
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SongDetail;
