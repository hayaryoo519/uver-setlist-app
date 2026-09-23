import React from 'react';
import { Calendar, MapPin, ArrowRight, Sparkles, Flame, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export const UpcomingLives = ({ lives }) => {
    if (!lives || lives.length === 0) return null;

    // Show only next 4
    const nextLives = lives.slice(0, 4);

    return (
        <div style={{ marginBottom: '50px' }}>
            <h2 className="section-title next-live-header" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                Next Live
                <span className="prediction-badge">
                    <Flame size={14} />
                    セトリ予想受付中
                </span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '20px' }}>
                {nextLives.map((live, index) => (
                    <div
                        key={index}
                        className="upcoming-card"
                        style={{
                            background: 'var(--card-bg)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '25px',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '200px'
                        }}
                    >
                        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                            <div style={{
                                fontSize: '0.8rem',
                                color: index === 0 ? '#fbbf24' : '#94a3b8',
                                fontWeight: 'bold',
                                letterSpacing: '1px',
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                {index === 0 && <Star size={14} fill="currentColor" />}
                                {index === 0 ? 'NEXT LIVE' : 'UPCOMING'}
                            </div>

                            <h3 style={{
                                fontSize: '1.3rem',
                                fontWeight: 'bold',
                                color: '#fff',
                                lineHeight: '1.4',
                                marginBottom: '15px'
                            }}>
                                {live.tour_name || live.title || "Special Live"}
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#cbd5e1', fontSize: '0.95rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={16} color="var(--primary-color)" />
                                    <span style={{ fontWeight: 'bold', color: '#fff' }}>
                                        {(() => {
                                            const d = new Date(live.date.split('T')[0].replace(/-/g, '/'));
                                            return isNaN(d.getTime()) ? live.date : d.toLocaleDateString('ja-JP', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit'
                                            }).replace(/\//g, '.');
                                        })()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={16} color="var(--primary-color)" />
                                    <span>{live.venue}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            marginTop: '20px',
                            paddingTop: '15px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <Link
                                    to={`/predictions/new?live_id=${live.id}`}
                                    state={{ from: '/dashboard' }}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: '#2563eb',
                                        border: 'none',
                                        color: '#fff',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        textDecoration: 'none',
                                    }}
                                    className="hover:bg-blue-700 transition-all"
                                >
                                    <Sparkles size={14} /> 予想する

                                </Link>
                                <Link
                                    to={`/predictions?live_id=${live.id}`}
                                    state={{ from: '/dashboard' }}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: 'rgba(15, 23, 42, 0.86)',
                                        border: '1px solid rgba(148, 163, 184, 0.35)',
                                        color: '#fff',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        textDecoration: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    className="hover:bg-slate-700 transition-all"
                                >
                                    みんなの予想を見る

                                </Link>
                            </div>
                        </div>

                    </div>
                ))}
            </div>


            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .upcoming-card:hover {
                    transform: translateY(-3px);
                    border-color: rgba(251, 191, 36, 0.3) !important;
                    transition: all 0.3s ease;
                }

                .next-live-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .prediction-badge {
                    background: #fbbf24;
                    color: #000;
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    font-weight: 800;
                    white-space: nowrap;
                }

                @media (max-width: 480px) {
                    .next-live-header {
                        flex-direction: row;
                        align-items: center;
                    }
                    .prediction-badge {
                        font-size: 0.75rem;
                        padding: 3px 10px;
                    }
                }

            `}</style>
        </div>
    );
};
