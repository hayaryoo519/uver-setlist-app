import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/Auth/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Loader, ArrowRight } from 'lucide-react';
import { apiClient, ApiError } from '../lib/apiClient';
import type { User } from '../types/api';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');
    const { logout } = useAuth(); // If already logged in somehow, logout? Or just verify.
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('無効なリンクです。');
            return;
        }

        apiClient.post<{ token: string; user: User }>('/api/auth/verify-email', { token })
            .then((data) => {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setStatus('success');
                setTimeout(() => { window.location.href = '/mypage'; }, 3000);
            })
            .catch((err) => {
                setStatus('error');
                setMessage(
                    err instanceof ApiError
                        ? (err.data?.message || '認証に失敗しました。')
                        : 'サーバーエラーが発生しました。'
                );
            });
    }, [token]);

    return (
        <AuthLayout title="メールアドレス認証" subtitle="本人確認">
            <div style={{ textAlign: 'center', padding: '20px' }}>
                {status === 'verifying' && (
                    <>
                        <Loader size={40} className="animate-spin" style={{ margin: '0 auto 20px', color: 'var(--primary-color)' }} />
                        <h3 style={{ color: '#fff' }}>認証中...</h3>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <CheckCircle size={40} color="#4ade80" />
                        </div>
                        <h3 style={{ color: '#fff', marginBottom: '10px' }}>認証完了！</h3>
                        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                            メールアドレスの確認が完了しました。<br />
                            自動的にマイページへ移動します...
                        </p>
                        <Link to="/mypage" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                            マイページへ <ArrowRight size={18} />
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <XCircle size={40} color="#f87171" />
                        </div>
                        <h3 style={{ color: '#fff', marginBottom: '10px' }}>認証失敗</h3>
                        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                            {message}
                        </p>
                        <Link to="/login" style={{ color: 'var(--primary-color)' }}>
                            ログイン画面へ戻る
                        </Link>
                    </>
                )}
            </div>
        </AuthLayout>
    );
};

export default VerifyEmail;
