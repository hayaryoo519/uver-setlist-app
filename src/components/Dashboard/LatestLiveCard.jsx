import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const LatestLiveCard = ({ live }) => {
    const location = useLocation();
    if (!live) return null;
    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            marginBottom: '30px',
            position: 'relative',
            overflow: 'hidden'
        }}>


            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '2px',
                    color: '#fbbf24',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ width: '6px', height: '6px', background: '#fbbf24', borderRadius: '50%', display: 'inline-block' }}></span>
                    LATEST LIVE
                </div>

                <h3 style={{
                    fontSize: '1.8rem',
                    margin: '0 0 10px 0',
                    lineHeight: '1.2',
                    fontWeight: '800'
                }}>
                    {live.tour_name || live.title}
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px', color: '#cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📅 <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '1rem' }}>
                            {(() => {
                                const d = new Date(live.date);
                                return isNaN(d.getTime()) ? live.date : d.toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                }).replace(/\//g, '.');
                            })()}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📍 <span style={{ fontWeight: '500', color: '#fff', fontSize: '0.9rem' }}>{live.venue}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Link
                        to={`/live/${live.id}`}
                        state={{ from: location.pathname }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#fbbf24',
                            color: '#000',
                            padding: '12px 24px',
                            borderRadius: '50px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
                        }}
                        className="hover:scale-105"
                    >
                        セットリストを見る <ArrowRight size={16} />
                    </Link>
                    <Link
                        to={`/predictions?live_id=${live.id}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.3)', /* さらに明るく */
                            border: '1px solid rgba(255, 255, 255, 0.6)', /* 枠線を強調 */
                            color: '#fff',
                            padding: '12px 24px',
                            borderRadius: '50px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s',
                        }}
                        className="hover:bg-white/40 hover:scale-105"
                    >
                        みんなの予想を見る
                    </Link>
                </div>
            </div>
        </div>
    );
};
