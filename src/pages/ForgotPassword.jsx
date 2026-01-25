import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/Auth/AuthLayout';
import { Mail, ArrowRight, Loader, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitted(true);
                setMessage(data.message);
            } else {
                setError(data.message || 'エラーが発生しました。');
            }
        } catch (err) {
            setError('サーバーとの通信に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <AuthLayout title="メールを確認" subtitle="再設定リンクを送信しました">
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <CheckCircle size={40} color="#4ade80" />
                    </div>
                    <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '30px' }}>
                        {message}
                    </p>
                    <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>
                        ログイン画面に戻る
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="パスワード再設定" subtitle="登録済みのメールアドレスを入力してください">
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
                <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>メールアドレス</label>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
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
                >
                    {isLoading ? <Loader size={20} className="animate-spin" /> : <>再設定メールを送信 <ArrowRight size={20} /></>}
                </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
                <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>ログイン画面に戻る</Link>
            </div>
        </AuthLayout>
    );
};

export default ForgotPassword;
