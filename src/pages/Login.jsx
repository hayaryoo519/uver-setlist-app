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
                            tabIndex={1}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ color: 'var(--lp-slate-400)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>パスワード</label>
                        <Link to="/forgot-password" tabIndex={4} style={{ color: 'var(--lp-slate-500)', fontSize: '0.8rem', textDecoration: 'none', transition: 'color 0.3s' }} onMouseEnter={(e) => e.target.style.color = 'var(--lp-gold)'} onMouseLeave={(e) => e.target.style.color = 'var(--lp-slate-500)'}>忘れた場合</Link>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--lp-slate-500)', zIndex: 1 }} />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="premium-input"
                            tabIndex={2}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    tabIndex={3}
                    className="premium-btn"
                    style={{ width: '100%', padding: '14px' }}
                >
                    {isLoading ? <Loader size={20} className="animate-spin" /> : <>ログイン <ArrowRight size={20} /></>}
                </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.95rem', color: 'var(--lp-slate-400)' }}>
                アカウントをお持ちでないですか？<br />
                <Link to="/signup" style={{ color: 'var(--lp-gold)', textDecoration: 'none', fontWeight: '700', display: 'inline-block', marginTop: '10px', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', transition: 'all 0.3s' }} onMouseEnter={(e) => e.target.style.borderBottomColor = 'var(--lp-gold)'} onMouseLeave={(e) => e.target.style.borderBottomColor = 'rgba(212, 175, 55, 0.3)'}>新規アカウント作成</Link>
            </div>
        </AuthLayout>
    );
};

export default Login;
