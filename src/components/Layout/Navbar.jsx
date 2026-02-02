import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, Calendar, LogIn, LogOut, Shield, ListMusic, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    const isHome = location.pathname === '/';

    return (
        <>
            <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
                <div className="nav-container">
                    <Link to="/" className="nav-logo">
                        <span className="text-gold">UVERworld</span> Setlist Archive
                    </Link>

                    {/* Desktop Menu */}
                    <div className="nav-links desktop-only">
                        <Link to="/songs" className="nav-link">
                            <ListMusic size={18} /> Discography
                        </Link>
                        <Link to="/lives" className="nav-link">
                            <Calendar size={18} /> Archive
                        </Link>
                        {currentUser && (
                            <Link to="/mypage" className="nav-link">
                                <User size={18} /> My Page
                            </Link>
                        )}

                        {currentUser?.role === 'admin' && (
                            <Link to="/admin" className="nav-link" style={{ color: '#fbbf24' }}>
                                <Shield size={18} /> Admin Panel
                            </Link>
                        )}
                        {currentUser ? (
                            <button onClick={handleLogout} className="nav-btn-primary" style={{ textDecoration: 'none' }}>
                                <LogOut size={18} /> ログアウト
                            </button>
                        ) : (
                            <Link to="/login" className="nav-btn-primary" style={{ textDecoration: 'none' }}>
                                <LogIn size={18} /> ログイン
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-nav-links">
                    <Link to="/" className="mobile-nav-link">Home</Link>
                    <Link to="/songs" className="mobile-nav-link">Discography</Link>
                    <Link to="/lives" className="mobile-nav-link">Archive</Link>
                    {currentUser && <Link to="/mypage" className="mobile-nav-link">My Page</Link>}

                    <div className="mobile-nav-divider"></div>
                    {currentUser ? (
                        <button onClick={handleLogout} className="mobile-nav-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>ログアウト</button>
                    ) : (
                        <Link to="/login" className="mobile-nav-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>ログイン / 新規登録</Link>
                    )}
                </div>
            </div>

            <style>{`
                .navbar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    z-index: 1000;
                    padding: 20px 0;
                    transition: all 0.3s ease;
                    background: transparent;
                }

                .navbar.scrolled {
                    padding: 15px 0;
                    background: rgba(15, 23, 42, 0.85); /* Dark blue/slate background */
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .nav-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .nav-logo {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: white;
                    text-decoration: none;
                    letter-spacing: -0.5px;
                }

                .text-gold {
                    color: var(--primary-color);
                }

                .nav-links {
                    display: flex;
                    align-items: center;
                    gap: 30px;
                }

                .nav-link {
                    color: #cbd5e1;
                    text-decoration: none;
                    font-size: 0.95rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: color 0.2s;
                }

                .nav-link:hover {
                    color: var(--primary-color);
                }

                .nav-btn-primary {
                    background: var(--primary-color);
                    color: black;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 4px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: transform 0.2s, background 0.2s;
                }

                .nav-btn-primary:hover {
                    transform: translateY(-2px);
                    background: #fbbf24; /* Lighter gold */
                }

                .mobile-menu-btn {
                    display: none;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                }

                /* Mobile Menu Styles */
                .mobile-menu {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    background: var(--bg-color);
                    z-index: 999;
                    transform: translateY(-100%);
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease-in-out;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: none;
                }

                .mobile-menu.open {
                    transform: translateY(0);
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                }

                .mobile-nav-links {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 25px;
                    width: 100%;
                }

                .mobile-nav-link {
                    color: white;
                    text-decoration: none;
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .mobile-nav-divider {
                    width: 40px;
                    height: 2px;
                    background: rgba(255,255,255,0.1);
                    margin: 10px 0;
                }

                .mobile-nav-btn {
                    background: transparent;
                    border: 1px solid var(--primary-color);
                    color: var(--primary-color);
                    padding: 12px 30px;
                    font-size: 1.1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    width: fit-content;
                }

                @media (max-width: 768px) {
                    .desktop-only {
                        display: none;
                    }
                    .mobile-menu-btn {
                        display: block;
                    }
                }
            `}</style>
        </>
    );
};

export default Navbar;
