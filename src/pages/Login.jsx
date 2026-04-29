import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/Auth/AuthLayout';
import { Mail, Lock, ArrowRight, Loader } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(email, password);
            if (result.success) {
                navigate('/mypage');
            } else {
                setError(result.message || 'ログインに失敗しました。メールアドレスとパスワードを確認してください。');
            }
        } catch (err) {
            setError('予期せぬエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout title="ログイン" subtitle="UVERworld Setlist Archive へようこそ">
            {error && <div className="auth-error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
                <div className="auth-input-group">
                    <label htmlFor="email" className="auth-label">メールアドレス</label>
                    <div className="auth-input-wrapper">
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="premium-input"
                            tabIndex={1}
                        />
                        <Mail size={18} className="auth-input-icon" />
                    </div>
                </div>

                <div className="auth-input-group" style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label htmlFor="password" className="auth-label" style={{ marginBottom: 0 }}>パスワード</label>
                        <Link to="/forgot-password" tabIndex={4} className="auth-link" style={{ fontSize: '0.8rem', marginTop: 0, borderBottom: 'none', color: 'var(--lp-slate-500)', fontWeight: '500' }} onMouseEnter={(e) => e.target.style.color = 'var(--lp-gold)'} onMouseLeave={(e) => e.target.style.color = 'var(--lp-slate-500)'}>忘れた場合</Link>
                    </div>
                    <div className="auth-input-wrapper">
                        <input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="premium-input"
                            tabIndex={2}
                        />
                        <Lock size={18} className="auth-input-icon" />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    tabIndex={3}
                    className="premium-btn"
                    style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
                >
                    {isLoading ? <Loader size={20} className="animate-spin" /> : <>ログイン <ArrowRight size={20} /></>}
                </button>
            </form>

            <div className="auth-footer-text">
                アカウントをお持ちでないですか？<br />
                <Link to="/signup" className="auth-link">新規アカウント作成</Link>
            </div>
        </AuthLayout>
    );
};

export default Login;
