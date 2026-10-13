import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '../components/Auth/AuthLayout';
import { useResendVerification } from '../hooks/queries/useAuthMutations';
import { CheckCircle, XCircle, Loader, ArrowRight } from 'lucide-react';
import { apiClient, ApiError } from '../lib/apiClient';
import type { User } from '../types/api';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [resendMessage, setResendMessage] = useState('');
    const [resendError, setResendError] = useState('');
    const resend = useResendVerification();
    const verificationRequest = useRef<{ token: string; promise: Promise<{ token: string; user: User }> } | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('認証メールが届かない場合やリンクの期限が切れた場合は、再送を依頼してください。');
            return;
        }

        let active = true;
        let redirectTimer: ReturnType<typeof setTimeout> | undefined;
        setStatus('verifying');
        if (verificationRequest.current?.token !== token) {
            verificationRequest.current = { token, promise: apiClient.post<{ token: string; user: User }>('/api/auth/verify-email', { token }) };
        }
        verificationRequest.current.promise
            .then((data) => {
                if (!active) return;
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setStatus('success');
                redirectTimer = setTimeout(() => { window.location.href = '/mypage'; }, 3000);
            })
            .catch((err) => {
                if (!active) return;
                setStatus('error');
                setMessage(
                    err instanceof ApiError
                        ? (err.data?.message || '認証に失敗しました。')
                        : 'サーバーエラーが発生しました。'
                );
            });
        return () => { active = false; if (redirectTimer) clearTimeout(redirectTimer); };
    }, [token]);

    const requestResend = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); setResendMessage(''); setResendError('');
        resend.mutate(email, {
            onSuccess: data => setResendMessage(data.message),
            onError: err => setResendError(err instanceof ApiError ? (err.data?.message || '再送の依頼に失敗しました。') : '再送の依頼に失敗しました。'),
        });
    };

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
                        <h3 style={{ color: '#fff', marginBottom: '10px' }}>{token ? '認証失敗' : '認証メールの再送'}</h3>
                        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                            {message}
                        </p>
                        <form onSubmit={requestResend} style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <label htmlFor="resend-email" className="auth-label">登録したメールアドレス</label>
                            <input id="resend-email" type="email" required maxLength={255} value={email} onChange={event => setEmail(event.target.value)} className="premium-input" autoComplete="email" />
                            <p style={{ color: '#94a3b8' }}>再送後は最新のメールのリンクを使ってください。有効期限は24時間です。</p>
                            {resendMessage && <p role="status" style={{ color: '#94a3b8' }}>{resendMessage}</p>}
                            {resendError && <p role="alert" className="auth-error-message">{resendError}</p>}
                            <button type="submit" disabled={resend.isPending} className="btn-primary">{resend.isPending ? '受付中...' : '認証メールの再送を依頼'}</button>
                        </form>
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
