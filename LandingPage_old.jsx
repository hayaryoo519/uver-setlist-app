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
                description="UVERworld縺ｮ繝ｩ繧､繝門盾謌ｦ險倬鹸繧貞庄隕門喧縺吶ｋ繝輔ぃ繝ｳ繧ｵ繧､繝医・
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
                                <button onClick={handleLogout} className="lp-nav-btn">繝ｭ繧ｰ繧｢繧ｦ繝・/button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="lp-nav-link">繝ｭ繧ｰ繧､繝ｳ</Link>
                                <Link to="/signup" className="lp-nav-btn">譁ｰ隕冗匳骭ｲ</Link>
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
                    <p className="lp-hero-subtitle">縺ゅ・譌･縺ｮ諢溷虚繧偵∵ｰｸ驕縺ｫ縲・/p>
                    <p className="lp-hero-description">
                        縺ゅ↑縺溘′蜿よ姶縺励◆繝ｩ繧､繝悶ｒ險倬鹸縺励√ョ繝ｼ繧ｿ縺ｧ謖ｯ繧願ｿ斐ｋ縲・br className="responsive-br" />
                        繝輔ぃ繝ｳ縺ｫ繧医ｋ縲√Λ繧､繝紋ｽ馴ｨ薙ｒ蜿ｯ隕門喧縺吶ｋ髱槫・蠑上い繝ｼ繧ｫ繧､繝悶・                    </p>
                    <div className="lp-hero-cta">
                        <Link to="/signup" className="lp-btn lp-btn-primary">
                            蜿よ姶險倬鹸繧貞ｧ九ａ繧・                        </Link>
                        <Link to="/dashboard" className="lp-btn lp-btn-secondary">
                            繝・・繧ｿ繧定ｦ九ｋ・育匳骭ｲ荳崎ｦ・ｼ・                        </Link>
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
                <h2 className="lp-section-title">荳ｻ縺ｪ讖溯・</h2>
                <p className="lp-section-subtitle">
                    UVERworld縺ｮ繝ｩ繧､繝悶ｒ繧ゅ▲縺ｨ讌ｽ縺励・縺溘ａ縺ｮ讖溯・縺梧ｺ霈・                </p>

                <div className="lp-features-grid">
                    <div className="lp-feature-card">
                        <div className="lp-feature-icon">統</div>
                        <h3 className="lp-feature-title">繧ｻ繝・ヨ繝ｪ繧ｹ繝磯夢隕ｧ</h3>
                        <p className="lp-feature-description">
                            驕主悉縺ｮ繝ｩ繧､繝悶そ繝・ヨ繝ｪ繧ｹ繝医ｒ譌･莉倥・莨壼ｴ繝ｻ繝・い繝ｼ蛻･縺ｫ髢ｲ隕ｧ縲ゅ≠縺ｮ譌･縺ｮ繝ｩ繧､繝悶〒菴輔′貍泌･上＆繧後◆縺九√☆縺舌↓遒ｺ隱阪〒縺阪∪縺吶・                        </p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="lp-feature-icon">投</div>
                        <h3 className="lp-feature-title">邨ｱ險亥・譫・/h3>
                        <p className="lp-feature-description">
                            蜿ょ刈縺励◆繝ｩ繧､繝悶・蟷ｴ蛻･謗ｨ遘ｻ縲√ｈ縺剰・縺・◆讌ｽ譖ｲ縺ｮ繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ縺ｪ縺ｩ縲√≠縺ｪ縺溘・繝ｩ繧､繝紋ｽ馴ｨ薙ｒ蜿ｯ隕門喧縺励∪縺吶・                        </p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="lp-feature-icon">七</div>
                        <h3 className="lp-feature-title">讌ｽ譖ｲ繧ｳ繝ｬ繧ｯ繧ｷ繝ｧ繝ｳ</h3>
                        <p className="lp-feature-description">
                            繝ｪ繝ｪ繝ｼ繧ｹ縺輔ｌ縺溷・讌ｽ譖ｲ縺ｮ貍泌･乗ュ蝣ｱ繧偵ョ繝ｼ繧ｿ繝吶・繧ｹ蛹悶ょｮ夂分譖ｲ縺九ｉ繝ｬ繧｢譖ｲ縺ｾ縺ｧ縲・℃蜴ｻ縺ｮ繝ｩ繧､繝悶〒縺・▽謚ｫ髴ｲ縺輔ｌ縺溘°繧定ｩｳ縺励￥繝√ぉ繝・け縺ｧ縺阪∪縺吶・                        </p>
                    </div>
                </div>
            </section>

            {/* How to Use Section */}
            <section className="lp-section lp-how-to-use">
                <h2 className="lp-section-title">菴ｿ縺・婿</h2>
                <p className="lp-section-subtitle">
                    縺溘▲縺・繧ｹ繝・ャ繝励〒蟋九ａ繧峨ｌ縺ｾ縺・                </p>

                <div className="lp-steps">
                    <div className="lp-step">
                        <div className="lp-step-number">1</div>
                        <h3 className="lp-step-title">繧｢繧ｫ繧ｦ繝ｳ繝井ｽ懈・</h3>
                        <p className="lp-step-description">
                            縺ｾ縺壹・辟｡譁咏匳骭ｲ縲ゅΓ繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺縺代〒縲√≠縺ｪ縺溘・蜿よ姶螻･豁ｴ繧剃ｿ晏ｭ倥☆繧九後・繧､繝壹・繧ｸ縲阪′菴懊ｉ繧後∪縺吶・                        </p>
                    </div>

                    <div className="lp-step">
                        <div className="lp-step-number">2</div>
                        <h3 className="lp-step-title">讀懃ｴ｢ & 蜿よ姶繝懊ち繝ｳ</h3>
                        <p className="lp-step-description">
                            繝・い繝ｼ蜷阪ｄ莨壼ｴ縲∵ｼ泌･乗峇縺九ｉ驕主悉縺ｮ繝ｩ繧､繝悶ｒ讀懃ｴ｢縲ゅ悟盾謌ｦ縺励◆・√阪・繧ｿ繝ｳ繧呈款縺吶□縺代〒險倬鹸螳御ｺ・〒縺吶・                        </p>
                    </div>

                    <div className="lp-step">
                        <div className="lp-step-number">3</div>
                        <h3 className="lp-step-title">閾ｪ蜍輔〒繝・・繧ｿ蛹・/h3>
                        <p className="lp-step-description">
                            蜿よ姶謨ｰ繧・∬・縺・◆蝗樊焚縺ｮ螟壹＞譖ｲ繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ縺ｪ縺ｩ繧定・蜍慕函謌舌ゅ≠縺ｪ縺溘・豢ｻ蜍募ｱ･豁ｴ縺悟庄隕門喧縺輔ｌ縺ｾ縺吶・                        </p>
                    </div>

                    <div className="lp-step">
                        <div className="lp-step-number">4</div>
                        <h3 className="lp-step-title">閨ｴ縺・◆譖ｲ繧堤ｮ｡逅・/h3>
                        <p className="lp-step-description">
                            縺ゅ↑縺溘・蜿よ姶螻･豁ｴ縺ｨ閾ｪ蜍暮｣謳ｺ縲り・縺・◆縺薙→縺ｮ縺ゅｋ譖ｲ縺ｨ譛ｪ閨ｴ縺ｮ譖ｲ縺御ｸ逶ｮ縺ｧ蛻・°繧翫∪縺吶・                        </p>
                    </div>
                </div>
            </section>

            {/* Disclaimer Section */}
            <section className="lp-section lp-disclaimer">
                <h2 className="lp-section-title">驥崎ｦ√↑縺顔衍繧峨○</h2>
                <p className="lp-section-subtitle">
                    縺泌茜逕ｨ蜑阪↓蠢・★縺願ｪｭ縺ｿ縺上□縺輔＞
                </p>

                <div className="lp-disclaimer-grid">
                    <div className="lp-disclaimer-card">
                        <div className="lp-disclaimer-icon">笞・・/div>
                        <h3 className="lp-disclaimer-title">髱槫・蠑上ヵ繧｡繝ｳ繧ｵ繧､繝・/h3>
                        <p className="lp-disclaimer-text">
                            譛ｬ繧ｵ繧､繝医・UVERworld縲∵園螻樔ｺ句漁謇縲√Ξ繧ｳ繝ｼ繝我ｼ夂､ｾ縺ｨ縺ｯ荳蛻・未菫ゅ・縺ｪ縺・√ヵ繧｡繝ｳ縺ｫ繧医ｋ髱槫・蠑上し繧､繝医〒縺吶・                        </p>
                    </div>

                    <div className="lp-disclaimer-card">
                        <div className="lp-disclaimer-icon">側</div>
                        <h3 className="lp-disclaimer-title">蛟倶ｺｺ驕句霧</h3>
                        <p className="lp-disclaimer-text">
                            蛟倶ｺｺ縺瑚ｶ｣蜻ｳ縺ｧ驕句霧縺励※縺・ｋ繝輔ぃ繝ｳ繧ｵ繧､繝医〒縺吶ゅョ繝ｼ繧ｿ縺ｮ螳悟・諤ｧ繧・ｶ咏ｶ壽ｧ繧剃ｿ晁ｨｼ縺吶ｋ繧ゅ・縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・                        </p>
                    </div>

                    <div className="lp-disclaimer-card">
                        <div className="lp-disclaimer-icon">圻</div>
                        <h3 className="lp-disclaimer-title">蜈崎ｲｬ莠矩・/h3>
                        <p className="lp-disclaimer-text">
                            譛ｬ繧ｵ繧､繝医・蛻ｩ逕ｨ縺ｫ繧医▲縺ｦ逕溘§縺溘＞縺九↑繧区錐螳ｳ縺ｫ縺､縺・※繧ゅ・°蝟ｶ閠・・雋ｬ莉ｻ繧定ｲ縺・°縺ｭ縺ｾ縺吶り・蟾ｱ雋ｬ莉ｻ縺ｧ縺泌茜逕ｨ縺上□縺輔＞縲・                        </p>
                    </div>

                    <div className="lp-disclaimer-card">
                        <div className="lp-disclaimer-icon">透</div>
                        <h3 className="lp-disclaimer-title">縺雁撫縺・粋繧上○</h3>
                        <p className="lp-disclaimer-text">
                            繝・・繧ｿ縺ｮ菫ｮ豁｣萓晞ｼ縺ｯ縲√御ｸ榊・蜷医・繝・・繧ｿ菫ｮ豁｣萓晞ｼ縲阪°繧峨＃騾｣邨｡縺上□縺輔＞縲ゅ◎縺ｮ莉悶・°蝟ｶ縺ｫ髢｢縺吶ｋ縺雁撫縺・粋繧上○縺ｯ荳玖ｨ倥∪縺ｧ縺秘｣邨｡縺上□縺輔＞縲・br />
                            <strong>X (Twitter):</strong> @setlist_archive
                        </p>
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="lp-final-cta">
                <h2 className="lp-final-cta-title">莉翫☆縺仙ｧ九ａ繧医≧</h2>
                <div className="lp-final-cta-buttons">
                    <Link to="/signup" className="lp-btn lp-btn-primary">
                        蜿よ姶險倬鹸繧貞ｧ九ａ繧・                    </Link>
                    <Link to="/dashboard" className="lp-btn lp-btn-secondary">
                        繝・・繧ｿ繧定ｦ九ｋ・育匳骭ｲ荳崎ｦ・ｼ・                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="lp-footer">
                <p className="lp-footer-text">
                    ﾂｩ {new Date().getFullYear()} UVERworld Setlist Archive. Unofficial fan project.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
