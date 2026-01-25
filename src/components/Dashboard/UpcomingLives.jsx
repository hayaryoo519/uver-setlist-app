import React from 'react';
import { Calendar, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const UpcomingLives = ({ lives }) => {
    if (!lives || lives.length === 0) return null;

    // Show only next 4
    const nextLives = lives.slice(0, 4);

    return (
        <div style={{ marginBottom: '50px' }}>
            <h2 className="section-title" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={20} color="#fbbf24" style={{ animation: 'pulse 2s infinite' }} />
                Next Live
                <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal' }}>
                    （セットリスト予想 - Coming Soon）
                </span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {nextLives.map((live, index) => (
                    <div
                        key={index}
                        className="upcoming-card"
                        style={{
                            background: 'var(--card-bg)',
                            borderRadius: '16px',
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
                                {index === 0 ? '★ NEXT LIVE' : 'UPCOMING'}
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
                                    <span style={{ fontWeight: '500', color: '#fff' }}>{live.date}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={16} color="var(--primary-color)" />
                                    <span>{live.venue}</span>
                                </div>
                            </div>
                        </div>

                        {/* Future Actions Area */}
                        <div style={{
                            marginTop: '20px',
                            paddingTop: '15px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    disabled
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#64748b',
                                        fontSize: '0.8rem',
                                        cursor: 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Sparkles size={14} /> 予想する (準備中)
                                </button>
                                {/* AI Prediction Badge (Placeholder) */}
                                {/* 
                                <div style={{
                                    padding: '0 10px',
                                    display: 'flex', alignItems: 'center',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    color: '#38bdf8',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    border: '1px solid rgba(56, 189, 248, 0.2)'
                                }}>
                                    AI
                                </div>
                                */}
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
                    transform: translateY(-5px);
                    border-color: rgba(251, 191, 36, 0.3) !important;
                    transition: all 0.3s ease;
                }
            `}</style>
        </div>
    );
};
