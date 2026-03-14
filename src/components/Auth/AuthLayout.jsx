import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="auth-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--lp-black)',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decor (Shared with Landing Page style) */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                right: '-5%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(80px)',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-5%',
                left: '-5%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(60px)',
                zIndex: 0
            }} />

            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '450px',
                borderRadius: '24px',
                padding: '40px',
                zIndex: 1,
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <h1 style={{
                            fontSize: '1.8rem',
                            color: '#fff',
                            margin: '0 0 10px 0',
                            letterSpacing: '1px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            lineHeight: '1.1'
                        }}>
                            <span className="text-gold">UVERworld</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--lp-slate-400)', fontWeight: 'normal', letterSpacing: '3px', marginTop: '4px' }}>SETLIST ARCHIVE</span>
                        </h1>
                    </Link>
                    {title && <h2 style={{ fontSize: '1.5rem', marginTop: '24px', marginBottom: '8px', fontWeight: '700' }}>{title}</h2>}
                    {subtitle && <p style={{ color: 'var(--lp-slate-400)', fontSize: '0.95rem', margin: 0 }}>{subtitle}</p>}
                </div>

                {children}

                {/* Footer Links */}
                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.9rem' }}>
                    <Link to="/" style={{ color: 'var(--lp-slate-500)', textDecoration: 'none', transition: 'color 0.3s' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = 'var(--lp-slate-500)'}>
                        トップページに戻る
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
