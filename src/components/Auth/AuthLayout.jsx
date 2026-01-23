import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decor */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '-10%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(60px)',
                zIndex: 0
            }} />

            <div style={{
                width: '100%',
                maxWidth: '450px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '40px',
                zIndex: 1,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <h1 style={{
                            fontSize: '1.8rem',
                            color: '#fff',
                            margin: '0 0 10px 0',
                            letterSpacing: '1px'
                        }}>
                            <span style={{ color: 'var(--primary-color)' }}>UVERworld</span><br />
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal', letterSpacing: '2px' }}>Setlist Archive</span>
                        </h1>
                    </Link>
                    {title && <h2 style={{ fontSize: '1.5rem', marginTop: '20px', marginBottom: '5px' }}>{title}</h2>}
                    {subtitle && <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>{subtitle}</p>}
                </div>

                {children}

                {/* Footer Links */}
                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                    <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
