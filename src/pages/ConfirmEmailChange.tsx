import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/Auth/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, ApiError } from '../lib/apiClient';

const ConfirmEmailChange = () => {
    const [params] = useSearchParams();
    const token = params.get('token');
    const { logout } = useAuth();
    const logoutRef = useRef(logout); logoutRef.current = logout;
    const request = useRef<{ token: string; promise: Promise<{ message: string }> } | null>(null);
    const [status, setStatus] = useState('pending');
    const [message, setMessage] = useState('');
    useEffect(() => {
        if (!token) { setStatus('error'); setMessage('無効なリンクです。設定画面から変更を依頼してください。'); return; }
        let active = true; setStatus('pending');
        if (request.current?.token !== token) request.current = { token, promise: apiClient.post<{ message: string }>('/api/auth/confirm-email-change', { token }) };
        request.current.promise.then(data => {
            if (!active) return;
            logoutRef.current(); setStatus('success'); setMessage(data.message);
        }).catch(err => {
            if (!active) return;
            setStatus('error'); setMessage(err instanceof ApiError ? (err.data?.message || '確認に失敗しました。') : '確認に失敗しました。');
        });
        return () => { active = false; };
    }, [token]);
    return <AuthLayout title="メールアドレス変更" subtitle="変更先の確認">
        <div style={{ textAlign: 'center', padding: '20px' }}>
            {status === 'pending' ? <p>確認中...</p> : <>
                <h3>{status === 'success' ? 'メールアドレスを変更しました' : '変更を確認できませんでした'}</h3>
                <p role={status === 'error' ? 'alert' : 'status'}>{message}</p>
                <Link to={status === 'success' ? '/login' : '/settings'} className="auth-link">{status === 'success' ? '新しいメールアドレスでログイン' : '設定画面から再度依頼'}</Link>
            </>}
        </div>
    </AuthLayout>;
};

export default ConfirmEmailChange;
