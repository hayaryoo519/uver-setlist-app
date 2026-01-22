import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Music, BarChart3, Heart, ChevronDown, AlertTriangle, User, ShieldAlert, Mail } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing-page">
            <Helmet>
                <title>UVERworld Setlist Archive - ファンによるセットリスト記録サイト</title>
                <meta name="description" content="UVERworldのライブ参戦記録を可視化するファンサイト。あなたが参加したライブを記録し、統計データで振り返れます。" />
            </Helmet>

            {/* Header */}
            <header className="lp-header">
                <div className="lp-header-container">
                    <Link to="/" className="lp-logo">
                        <span className="lp-logo-text"><span className="text-gold">UVER</span>world Setlist Archive</span>
                    </Link>
                    <nav className="lp-nav">
                        <Link to="/login" className="lp-nav-link">ログイン</Link>
                        <Link to="/signup" className="lp-nav-btn">新規登録</Link>
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
                        あなたが参戦したライブを記録し、データで振り返る。<br />
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
                            参加したライブの年別推移、会場タイプの分布、よく聴いた楽曲のランキングなど、あなたのライブ体験を可視化します。
                        </p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="lp-feature-icon">🎵</div>
                        <h3 className="lp-feature-title">楽曲コレクション</h3>
                        <p className="lp-feature-description">
                            ライブで聴いた楽曲を自動で記録。全曲コンプリートを目指したり、まだ聴いたことのない楽曲を探したり。
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
                            無料でアカウントを作成。メールアドレスとパスワードだけでOK。
                        </p>
                    </div>

                    <div className="lp-step">
                        <div className="lp-step-number">2</div>
                        <h3 className="lp-step-title">ライブを記録</h3>
                        <p className="lp-step-description">
                            参加したライブを「マイページ」から記録。過去のライブも遡って登録できます。
                        </p>
                    </div>

                    <div className="lp-step">
                        <div className="lp-step-number">3</div>
                        <h3 className="lp-step-title">セットリスト確認</h3>
                        <p className="lp-step-description">
                            ライブ詳細ページでセットリストを確認。記憶を辿りながら当時の興奮を思い出そう。
                        </p>
                    </div>

                    <div className="lp-step">
                        <div className="lp-step-number">4</div>
                        <h3 className="lp-step-title">統計を楽しむ</h3>
                        <p className="lp-step-description">
                            マイページで統計をチェック。あなたのUVERworld愛が数字で見える！
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
                            データの削除依頼や著作権に関するお問い合わせは下記までご連絡ください。<br />
                            <strong>Email:</strong> contact@example.com<br />
                            <strong>X (Twitter):</strong> @example_account
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
