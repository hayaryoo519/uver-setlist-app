import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Globe, ArrowLeft, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import SEO from '../components/SEO';

function Settings() {
    const { currentUser, updateUser, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: currentUser?.username || '',
        email: currentUser?.email || '',
        is_public: currentUser?.is_public !== false,
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePasswordChange = (field: string, value: string) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        const isProfileChanged =
            formData.username !== currentUser?.username ||
            formData.email !== currentUser?.email ||
            formData.is_public !== (currentUser?.is_public !== false);
        const isPasswordChanged = passwordData.newPassword.length > 0;

        if (!isProfileChanged && !isPasswordChanged) {
            setMessage({ text: '変更箇所がありません', type: 'info' });
            return;
        }

        const payload: Record<string, string | boolean> = { ...formData };

        if (isPasswordChanged) {
            if (!passwordData.currentPassword) {
                setMessage({ text: '現在のパスワードを入力してください', type: 'error' });
                return;
            }
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                setMessage({ text: '新しいパスワードが一致しません', type: 'error' });
                return;
            }
            if (passwordData.newPassword.length < 6) {
                setMessage({ text: 'パスワードは6文字以上で設定してください', type: 'error' });
                return;
            }
            payload.password = passwordData.newPassword;
            payload.currentPassword = passwordData.currentPassword;
        }

        const res = await updateUser(payload);
        if (res.success) {
            setMessage({ text: '設定を更新しました', type: 'success' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } else {
            setMessage({ text: res.message || '更新に失敗しました', type: 'error' });
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('本当にアカウントを削除しますか？この操作は取り消せません。参戦履歴もすべて削除されます。')) {
            const res = await deleteAccount();
            if (res.success) {
                navigate('/');
            } else {
                setMessage({ text: res.message || '削除に失敗しました', type: 'error' });
            }
        }
    };

    return (
        <div className="container" style={{ paddingTop: '100px', maxWidth: '600px' }}>
            <SEO title="アカウント設定" description="" />

            <div style={{ marginBottom: '30px' }}>
                <Link to="/mypage" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} /> マイページに戻る
                </Link>
            </div>

            <div className="dashboard-panel" style={{ padding: '40px' }}>
                <h1 style={{ margin: '0 0 30px 0', fontSize: '1.8rem', fontWeight: '800' }}>
                    アカウント設定
                </h1>

                {message.text && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '25px',
                        fontSize: '0.9rem',
                        background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                            message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        color: message.type === 'success' ? '#4ade80' :
                            message.type === 'error' ? '#f87171' : '#94a3b8',
                        border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' :
                            message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSave}>
                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#cbd5e1', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>プロフィール設定</h2>
                        <div className="form-group">
                            <label><User size={16} /> ユーザー名</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                placeholder="ユーザー名"
                                minLength={2}
                                maxLength={30}
                                title="2文字以上30文字以内で入力してください"
                            />
                        </div>

                        <div className="form-group">
                            <label><Globe size={16} /> メールアドレス</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="メールアドレス"
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#cbd5e1', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>パスワード変更</h2>
                        <div className="form-group">
                            <label>現在のパスワード</label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                                placeholder="現在のパスワード（変更する場合のみ）"
                            />
                        </div>
                        <div className="form-group">
                            <label>新しいパスワード</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                                placeholder="新しいパスワード"
                            />
                        </div>
                        <div className="form-group">
                            <label>新しいパスワード（確認）</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                                placeholder="もう一度入力してください"
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#cbd5e1', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>プライバシー設定</h2>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, is_public: !prev.is_public }))}
                                style={{
                                    flexShrink: 0,
                                    width: '48px',
                                    height: '28px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '3px',
                                    transition: 'background 0.2s',
                                    background: formData.is_public ? '#eab308' : 'rgba(255,255,255,0.1)',
                                    position: 'relative',
                                }}
                                aria-label="参戦記録公開設定"
                            >
                                <span style={{
                                    display: 'block',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: '#fff',
                                    transition: 'transform 0.2s',
                                    transform: formData.is_public ? 'translateX(20px)' : 'translateX(0)',
                                }} />
                            </button>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: formData.is_public ? '#fde68a' : '#94a3b8', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                                    {formData.is_public ? <Eye size={14} /> : <EyeOff size={14} />}
                                    {formData.is_public ? '参戦記録を公開中' : '参戦記録を非公開'}
                                </div>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                    参戦記録（参戦ライブ・楽曲ランキング）を他のユーザーに公開します。<br />
                                    <span style={{ color: '#94a3b8' }}>※ セトリ予想は公開設定に関わらず常に公開されます。</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={handleDeleteAccount}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Trash2 size={14} /> アカウント削除
                        </button>

                        <button type="submit" className="save-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Save size={18} /> 変更を保存
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .form-group { margin-bottom: 25px; text-align: left; }
                .form-group label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #94a3b8; font-size: 0.9rem; }
                .form-group input {
                    width: 100%;
                    padding: 14px;
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    color: white;
                    font-size: 1rem;
                    transition: border-color 0.2s;
                }
                .form-group input:focus { outline: none; border-color: var(--primary-color); }
                
                .save-btn {
                    background: var(--primary-color);
                    color: black;
                    padding: 12px 24px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 700;
                    border: none;
                    transition: transform 0.2s, background 0.2s;
                }
                .save-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }
                .save-btn:active {
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
}

export default Settings;
