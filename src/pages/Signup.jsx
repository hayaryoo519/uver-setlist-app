import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/Auth/AuthLayout';
import { Mail, Lock, User, ArrowRight, Loader, CheckCircle } from 'lucide-react';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const [verificationSent, setVerificationSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError('パスワードが一致しません');
        }

        setError('');
        setIsLoading(true);

        try {
            const result = await register(username, email, password);
            if (result.success) {
                if (result.requireVerification) {
                    setVerificationSent(true);
                } else {
                    navigate('/mypage');
                }
            } else {
                setError(result.message || 'アカウント作成に失敗しました。');
            }
        } catch (err) {
            console.error("Signup Catch Error:", err);
            setError('予期せぬエラーが発生しました: ' + (err.message || String(err)));
        } finally {
            setIsLoading(false);
        }
    };

    if (verificationSent) {
        return (
            <AuthLayout title="メールを確認してください" subtitle="認証用リンクを送信しました">
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ background: 'rgba(212, 175, 55, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                        <CheckCircle size={40} color="var(--lp-gold)" />
                    </div>
                    <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.2rem' }}>送信完了</h3>
                    <p style={{ color: 'var(--lp-slate-400)', lineHeight: '1.7', marginBottom: '32px', fontSize: '0.95rem' }}>
                        <strong style={{ color: '#fff' }}>{email}</strong> 宛にメールを送信しました。<br />
                        記載されたリンクをクリックして、<br />アカウント登録を完了してください。
                    </p>
                    <div style={{ fontSize: '0.85rem', color: 'var(--lp-slate-500)', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                        メールが届かない場合は、迷惑メールフォルダをご確認ください。<br />
                        または <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }} style={{ color: 'var(--lp-gold)', textDecoration: 'none', fontWeight: '600' }}>再登録</a> をお試しください。
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="アカウント作成" subtitle="ライブの思い出を理想のアーカイブに">
            {error && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    padding: '12px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: 'var(--lp-slate-400)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>ユーザー名</label>
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--lp-slate-500)', zIndex: 1 }} />
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="UVERcrew名 (2〜30文字)"
                            className="premium-input"
                            minLength={2}
                            maxLength={30}
                            tabIndex={1}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: 'var(--lp-slate-400)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>メールアドレス</label>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--lp-slate-500)', zIndex: 1 }} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="premium-input"
                            tabIndex={2}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: 'var(--lp-slate-400)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>パスワード</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--lp-slate-500)', zIndex: 1 }} />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="パスワードを作成"
                            className="premium-input"
                            tabIndex={3}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', color: 'var(--lp-slate-400)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>パスワード（確認）</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--lp-slate-500)', zIndex: 1 }} />
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="パスワードを再入力"
                            className="premium-input"
                            tabIndex={4}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    tabIndex={5}
                    className="premium-btn"
                    style={{ width: '100%', padding: '14px' }}
                >
                    {isLoading ? <Loader size={20} className="animate-spin" /> : <>アカウント作成 <ArrowRight size={20} /></>}
                </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.95rem', color: 'var(--lp-slate-400)' }}>
                すでにアカウントをお持ちですか？<br />
                <Link to="/login" style={{ color: 'var(--lp-gold)', textDecoration: 'none', fontWeight: '700', display: 'inline-block', marginTop: '10px', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', transition: 'all 0.3s' }} onMouseEnter={(e) => e.target.style.borderBottomColor = 'var(--lp-gold)'} onMouseLeave={(e) => e.target.style.borderBottomColor = 'rgba(212, 175, 55, 0.3)'}>ログインはこちら</Link>
            </div>
        </AuthLayout>
    );
};

export default Signup;
