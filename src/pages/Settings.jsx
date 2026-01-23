import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Globe, ArrowLeft, Trash2, Save } from 'lucide-react';
import SEO from '../components/SEO';

function Settings() {
    const { currentUser, updateUser, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: currentUser?.username || '',
        email: currentUser?.email || ''
    });
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        if (formData.username === currentUser?.username && formData.email === currentUser?.email) {
            setMessage({ text: '変更箇所がありません', type: 'info' });
            return;
        }

        const res = await updateUser(formData);
        if (res.success) {
            setMessage({ text: '設定を更新しました', type: 'success' });
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
            <SEO title="Account Settings" />

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
                    <div className="form-group">
                        <label><User size={16} /> ユーザー名</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => handleInputChange('username', e.target.value)}
                            placeholder="Username"
                        />
                    </div>

                    <div className="form-group">
                        <label><Globe size={16} /> メールアドレス</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="email@example.com"
                        />
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
