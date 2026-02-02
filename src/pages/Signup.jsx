import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/Auth/AuthLayout';
import { Mail, Lock, User, ArrowRight, Loader } from 'lucide-react';

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
            <AuthLayout title="メールを確認" subtitle="認証メールを送信しました">
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Mail size={40} color="#fbbf24" />
                    </div>
                    <h3 style={{ color: '#fff', marginBottom: '15px' }}>認証メールを送信しました</h3>
                    <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '30px' }}>
                        <strong>{email}</strong> 宛に認証用リンクを送信しました。<br />
                        メール内のリンクをクリックして、アカウント登録を完了してください。
                    </p>
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                        メールが届かない場合は、迷惑メールフォルダもご確認ください。<br />
                        または <a href="#" onClick={() => window.location.reload()} style={{ color: 'var(--primary-color)' }}>再登録</a> をお試しください。
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="アカウント作成" subtitle="コミュニティに参加して思い出を記録しよう">
            {error && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>ユーザー名</label>
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="UVERcrew名"
                            tabIndex={1}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 40px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = '#334155'}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>メールアドレス</label>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            tabIndex={2}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 40px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = '#334155'}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>パスワード</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="パスワードを作成"
                            tabIndex={3}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 40px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = '#334155'}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>パスワード（確認）</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="パスワードを再入力"
                            tabIndex={4}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 40px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = '#334155'}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    tabIndex={5}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: 'var(--primary-color)',
                        color: '#000',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'transform 0.1s, opacity 0.2s',
                        opacity: isLoading ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(0)')}
                >
                    {isLoading ? <Loader size={20} className="animate-spin" /> : <>登録する <ArrowRight size={20} /></>}
                </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
                すでにアカウントをお持ちですか？<br />
                <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', marginTop: '8px' }}>ログイン</Link>
            </div>
        </AuthLayout>
    );
};

export default Signup;
