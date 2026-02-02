import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Music, BarChart3, Heart, ChevronDown, AlertTriangle, User, ShieldAlert, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };
    return (
        <div className="landing-page">
            <SEO
                title=""
                description="UVERworldのライブ参戦記録を可視化するファンサイト。"
            />

            {/* Header */}
            <header className="lp-header">
                <div className="lp-header-container">
                    <Link to="/" className="lp-logo">
                        <span className="lp-logo-text"><span className="text-gold">UVERworld</span> Setlist Archive</span>
                    </Link>
                    <nav className="lp-nav">
                        {currentUser ? (
                            <>
                                <Link to="/mypage" className="lp-nav-link">My Page</Link>
                                <button onClick={handleLogout} className="lp-nav-btn">ログアウト</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="lp-nav-link">ログイン</Link>
                                <Link to="/signup" className="lp-nav-btn">新規登録</Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="lp-hero">
                <div className="lp-hero-bg">
                    <div className="lp-glow-effect"></div>
                </div>

                <div className="lp-hero-content">
                    <h1 className="lp-hero-title">
                        <span className="text-gold">UVER</span>WORLD<br />
                        <span className="text-subtitle-small">SETLIST ARCHIVE</span>
                    </h1>
                    <p className="lp-hero-subtitle">あの日の感動を、永遠に。</p>
                    <p className="lp-hero-description">
                        あなたが参戦したライブを記録し、データで振り返る。<br className="responsive-br" />
                        ファンによる、ライブ体験を可視化する非公式アーカイブ。
                    </p>
                    <div className="lp-hero-cta">
                        <Link to="/signup" className="lp-btn lp-btn-primary">
                            参戦記録を始める
                        </Link>
                        <Link to="/dashboard" className="lp-btn lp-btn-secondary">
                            データを見る（登録不要）
                        </Link>
                    </div>
                </div>

                <div className="lp-scroll-indicator">
                    <span>SCROLL</span>
                    <div className="lp-scroll-line"></div>
                    <ChevronDown size={24} color="var(--primary-color)" />
                </div>
            </section>

            {/* Features Section */}
            <section className="lp-section lp-features">
                <h2 className="lp-section-title">主な機能</h2>
                <p className="lp-section-subtitle">
                    UVERworldのライブをもっと楽しむための機能が満載
                </p>

                <div className="lp-features-grid">
                    <div className="lp-feature-card">
                        <div className="lp-feature-icon">📝</div>
                        <h3 className="lp-feature-title">セットリスト閲覧</h3>
                        <p className="lp-feature-description">
                            過去のライブセットリストを日付・会場・ツアー別に閲覧。あの日のライブで何が演奏されたか、すぐに確認できます。
                        </p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="lp-feature-icon">📊</div>
                        <h3 className="lp-feature-title">統計分析</h3>
                        <p className="lp-feature-description">
                            参加したライブの年別推移、よく聴いた楽曲のランキングなど、あなたのライブ体験を可視化します。
                        </p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="lp-feature-icon">🎵</div>
                        <h3 className="lp-feature-title">楽曲コレクション</h3>
                        <p className="lp-feature-description">
                            Discographyの各楽曲が、過去のライブでいつ演奏されたかをデータベース化。定番曲からレア曲まで、演奏履歴を詳しくチェックできます。
                        </p>
                    </div>
                </div>
            </section>

            {/* How to Use Section */}
            <section className="lp-section lp-how-to-use">
                <h2 className="lp-section-title">使い方</h2>
                <p className="lp-section-subtitle">
                    たった4ステップで始められます
                </p>

                <div className="lp-steps">
                    <div className="lp-step">
                        <div className="lp-step-number">1</div>
                        <h3 className="lp-step-title">アカウント作成</h3>
                        <p className="lp-step-description">
                            まずは無料登録。メールアドレスだけで、あなたの参戦履歴を保存する「マイページ」が作られます。
                        </p>
                    </div>

                    <div className="lp-step">
                        <div className="lp-step-number">2</div>
                        <h3 className="lp-step-title">検索 & 参戦ボタン</h3>
                        <p className="lp-step-description">
                            ツアー名や会場、演奏曲から過去のライブを検索。「参戦した！」ボタンを押すだけで記録完了です。
                        </p>
                    </div>

                    <div className="lp-step">
                        <div className="lp-step-number">3</div>
                        <h3 className="lp-step-title">自動でデータ化</h3>
                        <p className="lp-step-description">
                            参戦数や、聴いた回数の多い曲ランキングなどを自動生成。あなたの活動履歴が可視化されます。
                        </p>
                    </div>

                    <div className="lp-step">
                        <div className="lp-step-number">4</div>
                        <h3 className="lp-step-title">コンプリートを目指す</h3>
                        <p className="lp-step-description">
                            Discography機能と連動。データベースに登録された全楽曲を一覧でチェックし、詳細データを確認できます。
                        </p>
                    </div>
                </div>
            </section>

            {/* Disclaimer Section */}
            <section className="lp-section lp-disclaimer">
                <h2 className="lp-section-title">重要なお知らせ</h2>
                <p className="lp-section-subtitle">
                    ご利用前に必ずお読みください
                </p>

                <div className="lp-disclaimer-grid">
                    <div className="lp-disclaimer-card">
                        <div className="lp-disclaimer-icon">⚠️</div>
                        <h3 className="lp-disclaimer-title">非公式ファンサイト</h3>
                        <p className="lp-disclaimer-text">
                            本サイトはUVERworld、所属事務所、レコード会社とは一切関係のない、ファンによる非公式サイトです。
                        </p>
                    </div>

                    <div className="lp-disclaimer-card">
                        <div className="lp-disclaimer-icon">👤</div>
                        <h3 className="lp-disclaimer-title">個人運営</h3>
                        <p className="lp-disclaimer-text">
                            個人が趣味で運営しているファンサイトです。データの完全性や継続性を保証するものではありません。
                        </p>
                    </div>

                    <div className="lp-disclaimer-card">
                        <div className="lp-disclaimer-icon">🚫</div>
                        <h3 className="lp-disclaimer-title">免責事項</h3>
                        <p className="lp-disclaimer-text">
                            本サイトの利用によって生じたいかなる損害についても、運営者は責任を負いかねます。自己責任でご利用ください。
                        </p>
                    </div>

                    <div className="lp-disclaimer-card">
                        <div className="lp-disclaimer-icon">📧</div>
                        <h3 className="lp-disclaimer-title">お問い合わせ</h3>
                        <p className="lp-disclaimer-text">
                            データの修正依頼は、「不具合・データ修正依頼」からご連絡ください。その他、運営に関するお問い合わせは下記までご連絡ください。<br />
                            <strong>X (Twitter):</strong> @setlist_archive
                        </p>
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="lp-final-cta">
                <h2 className="lp-final-cta-title">今すぐ始めよう</h2>
                <div className="lp-final-cta-buttons">
                    <Link to="/signup" className="lp-btn lp-btn-primary">
                        参戦記録を始める
                    </Link>
                    <Link to="/dashboard" className="lp-btn lp-btn-secondary">
                        データを見る（登録不要）
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="lp-footer">
                <p className="lp-footer-text">
                    © {new Date().getFullYear()} UVERworld Setlist Archive. Unofficial fan project.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
