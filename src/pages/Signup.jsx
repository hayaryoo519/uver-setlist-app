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
                    <div className="auth-success-icon-wrapper">
                        <CheckCircle size={44} color="var(--lp-gold)" />
                    </div>
                    <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.5rem', fontWeight: '800' }}>送信完了</h3>
                    <p style={{ color: 'var(--lp-slate-400)', lineHeight: '1.8', marginBottom: '32px', fontSize: '1rem' }}>
                        <strong className="text-gold">{email}</strong> 宛にメールを送信しました。<br />
                        記載されたリンクをクリックして、<br />アカウント登録を完了してください。
                    </p>
                    <div style={{ fontSize: '0.9rem', color: 'var(--lp-slate-500)', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        メールが届かない場合は、迷惑メールフォルダをご確認ください。<br />
                        または <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }} className="auth-link">再登録</a> をお試しください。
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="アカウント作成" subtitle="ライブの思い出を理想のアーカイブに">
            {error && <div className="auth-error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
                <div className="auth-input-group">
                    <label className="auth-label">ユーザー名</label>
                    <div className="auth-input-wrapper">
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
                        <User size={18} className="auth-input-icon" />
                    </div>
                </div>

                <div className="auth-input-group">
                    <label className="auth-label">メールアドレス</label>
                    <div className="auth-input-wrapper">
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="premium-input"
                            tabIndex={2}
                        />
                        <Mail size={18} className="auth-input-icon" />
                    </div>
                </div>

                <div className="auth-input-group">
                    <label className="auth-label">パスワード</label>
                    <div className="auth-input-wrapper">
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="プレミアムパスワード"
                            className="premium-input"
                            tabIndex={3}
                        />
                        <Lock size={18} className="auth-input-icon" />
                    </div>
                </div>

                <div className="auth-input-group" style={{ marginBottom: '32px' }}>
                    <label className="auth-label">パスワード（確認）</label>
                    <div className="auth-input-wrapper">
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="パスワードを再入力"
                            className="premium-input"
                            tabIndex={4}
                        />
                        <Lock size={18} className="auth-input-icon" />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    tabIndex={5}
                    className="premium-btn"
                    style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
                >
                    {isLoading ? <Loader size={20} className="animate-spin" /> : <>アカウント作成 <ArrowRight size={20} /></>}
                </button>
            </form>

            <div className="auth-footer-text">
                すでにアカウントをお持ちですか？<br />
                <Link to="/login" className="auth-link">ログインはこちら</Link>
            </div>
        </AuthLayout>
    );
};

export default Signup;
