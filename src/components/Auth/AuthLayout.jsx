import React from 'react';
import { Link } from 'react-router-dom';
import registerImage from '../../assets/register-pc.png';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="auth-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--lp-black)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decor */}
            <div style={{
                position: 'absolute',
                top: '-15%',
                right: '-10%',
                width: '800px',
                height: '800px',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(100px)',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                left: '-10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(80px)',
                zIndex: 0
            }} />

            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '1200px',
                borderRadius: '24px',
                padding: '0',
                zIndex: 1,
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div className="auth-layout-inner">
                    {/* Left: Form Side */}
                    <div className="auth-form-side">
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <Link to="/" style={{ textDecoration: 'none' }}>
                                <h1 style={{
                                    fontSize: '2rem',
                                    color: '#fff',
                                    margin: '0',
                                    letterSpacing: '2px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    lineHeight: '1.2'
                                }}>
                                    <span className="text-gold" style={{ fontWeight: '900' }}>UVERworld</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--lp-slate-400)', fontWeight: '500', letterSpacing: '4px', marginTop: '6px' }}>SETLIST ARCHIVE</span>
                                </h1>
                            </Link>
                            {title && <h2 style={{ fontSize: '1.75rem', marginTop: '32px', marginBottom: '12px', fontWeight: '800', color: '#fff' }}>{title}</h2>}
                            {subtitle && <p style={{ color: 'var(--lp-slate-400)', fontSize: '1rem', margin: 0, lineHeight: '1.6' }}>{subtitle}</p>}
                        </div>

                        <div className="auth-content">
                            {children}
                        </div>

                        {/* Footer Links */}
                        <div style={{ marginTop: '32px', textAlign: 'center' }}>
                            <Link to="/" className="auth-link" style={{ fontSize: '0.9rem', color: 'var(--lp-slate-500)', borderBottom: 'none' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = 'var(--lp-slate-500)'}>
                                トップページへ戻る
                            </Link>
                        </div>
                    </div>

                    {/* Right: Image Side (Visible on PC) */}
                    <div className="auth-image-side">
                        <img src={registerImage} alt="Auth Backdrop" className="auth-side-img" />
                        <div className="auth-image-overlay" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
