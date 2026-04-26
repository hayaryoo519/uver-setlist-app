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
        let lastScrollY = window.scrollY;
        
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // 背景色の切り替え (50px以上で背景あり)
            if (currentScrollY > 50) {
                setIsScrolled(true);
                document.body.classList.add('scrolled');
            } else {
                setIsScrolled(false);
                document.body.classList.remove('scrolled');
            }

            // スクロール方向による表示・非表示の制御 (モバイル・デスクトップ共通)
            // ページ最上部付近（50px以下）では常に表示
            if (currentScrollY <= 50) {
                document.body.classList.remove('header-hidden');
            } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // 下スクロール & 一定以上スクロールで隠す
                document.body.classList.add('header-hidden');
            } else if (currentScrollY < lastScrollY) {
                // 上スクロールで表示
                document.body.classList.remove('header-hidden');
            }
            
            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
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
                            <ListMusic size={18} /> 楽曲一覧
                        </Link>
                        <Link to="/lives" className="nav-link">
                            <Calendar size={18} /> ライブ履歴
                        </Link>
                        <Link to="/predictions" className="nav-link">
                            <Sparkles size={18} /> セトリ予想
                        </Link>
                        {currentUser && (
                            <Link to="/mypage" className="nav-link">
                                <User size={18} /> マイページ
                            </Link>
                        )}

                        {currentUser?.role === 'admin' && (
                            <Link to="/admin" className="nav-link" style={{ color: '#fbbf24' }}>
                                <Shield size={18} /> 管理者パネル
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
                    <Link to="/" className="mobile-nav-link">ホーム</Link>
                    <Link to="/songs" className="mobile-nav-link">楽曲一覧</Link>
                    <Link to="/lives" className="mobile-nav-link">ライブ履歴</Link>
                    <Link to="/predictions" className="mobile-nav-link">セトリ予想</Link>
                    {currentUser && <Link to="/mypage" className="mobile-nav-link">マイページ</Link>}
                    {currentUser?.role === 'admin' && (
                        <Link to="/admin" className="mobile-nav-link" style={{ color: '#fbbf24' }}>管理者パネル</Link>
                    )}

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
                    padding: 12px 0; /* 20px -> 12px に縮小 */
                    transition: all 0.3s ease;
                    background: transparent;
                }
                
                /* Keep the offset in a way that can be easily hidden */
                .navbar {
                    top: 0;
                }

                /* Header Hide/Show Logic */
                body.header-hidden .navbar {
                    transform: translateY(-150%) !important;
                    opacity: 0 !important;
                    pointer-events: none;
                }

                .navbar.scrolled {
                    padding: 8px 0;
                    background: rgba(15, 23, 42, 0.9); /* Darker on scroll for better contrast */
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
                }

                /* Header Hide/Show Logic */
                .header-hidden .navbar {
                    transform: translateY(-100%);
                    opacity: 0;
                    pointer-events: none;
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
