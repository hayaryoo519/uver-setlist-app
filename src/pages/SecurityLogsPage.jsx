import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DailyLogsView from '../components/Admin/DailyLogsView';
import WeeklyAnalysisView from '../components/Admin/WeeklyAnalysisView';
import { Calendar, BarChart3, Trash2, Loader } from 'lucide-react';
import SEO from '../components/SEO';

export default function SecurityLogsPage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState(null); // 'daily' | 'weekly' | null
    const [recentLogs, setRecentLogs] = useState([]);
    const [analysisData, setAnalysisData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [cleanupResult, setCleanupResult] = useState(null);

    // Redirect if not admin
    React.useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('/');
        }
    }, [currentUser, navigate]);

    const handleDailyCheck = async () => {
        setIsLoading(true);
        setViewMode('daily');
        setCleanupResult(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('認証トークンが見つかりません。再度ログインしてください。');
                navigate('/login');
                return;
            }

            const res = await fetch('/api/logs/recent', {
                headers: { token }
            });

            if (res.ok) {
                const data = await res.json();
                setRecentLogs(data.logs);
            } else {
                if (res.status === 403 || res.status === 401) {
                    alert('認証エラー：再ログインが必要です。');
                    navigate('/login');
                    return;
                }
                alert('ログの取得に失敗しました');
            }
        } catch (err) {
            console.error(err);
            alert('エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleWeeklyAnalysis = async () => {
        setIsLoading(true);
        setViewMode('weekly');
        setCleanupResult(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('認証トークンが見つかりません。再度ログインしてください。');
                navigate('/login');
                return;
            }

            const res = await fetch('/api/logs/analysis', {
                headers: { token }
            });

            if (res.ok) {
                const data = await res.json();
                setAnalysisData(data);
            } else {
                if (res.status === 403 || res.status === 401) {
                    alert('認証エラー：再ログインが必要です。');
                    navigate('/login');
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                alert(`分析データの取得に失敗しました: ${errorData.message || res.statusText}`);
            }
        } catch (err) {
            console.error(err);
            alert('エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMonthlyCleanup = async () => {
        if (!window.confirm('30日以上前のログを削除しますか？\nこの操作は取り消せません。')) {
            return;
        }

        setIsLoading(true);
        setViewMode(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/logs/cleanup', {
                method: 'DELETE',
                headers: { token }
            });

            if (res.ok) {
                const data = await res.json();
                setCleanupResult(data);
            } else {
                alert('ログの削除に失敗しました');
            }
        } catch (err) {
            console.error(err);
            alert('エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser || currentUser.role !== 'admin') {
        return null;
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f1f5f9' }}>
            <SEO title="セキュリティログ - Admin" />

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
                {/* Back to Admin Link */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => navigate('/admin')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#1e293b',
                            color: '#94a3b8',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#334155';
                            e.currentTarget.style.color = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1e293b';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        ← 管理画面に戻る
                    </button>
                </div>

                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem',
                    color: '#f1f5f9'
                }}>
                    セキュリティログ
                </h1>
                <p style={{
                    color: '#94a3b8',
                    marginBottom: '2rem'
                }}>
                    ログの確認と管理
                </p>

                {/* アクションカード */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.5rem',
                    marginTop: '2rem'
                }}>
                    {/* 毎日チェック */}
                    <div style={{
                        backgroundColor: '#1e293b',
                        padding: '2rem',
                        borderRadius: '12px',
                        border: '1px solid #334155',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <Calendar size={32} color="#60a5fa" />
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                marginLeft: '0.75rem',
                                color: '#f1f5f9'
                            }}>
                                📅 毎日チェック
                            </h3>
                        </div>
                        <p style={{
                            color: '#94a3b8',
                            marginBottom: '1.5rem',
                            lineHeight: '1.6'
                        }}>
                            最新10件のログを確認して、異常がないかチェックします。
                        </p>
                        <button
                            onClick={handleDailyCheck}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.6 : 1,
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#2563eb')}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                        >
                            {isLoading && viewMode === 'daily' ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Loader size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
                                    読み込み中...
                                </span>
                            ) : '最新ログを表示'}
                        </button>
                    </div>

                    {/* 週間分析 */}
                    <div style={{
                        backgroundColor: '#1e293b',
                        padding: '2rem',
                        borderRadius: '12px',
                        border: '1px solid #334155',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <BarChart3 size={32} color="#10b981" />
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                marginLeft: '0.75rem',
                                color: '#f1f5f9'
                            }}>
                                📊 週間分析
                            </h3>
                        </div>
                        <p style={{
                            color: '#94a3b8',
                            marginBottom: '1.5rem',
                            lineHeight: '1.6'
                        }}>
                            過去7日間の統計と疑わしいIPアドレスを確認します。
                        </p>
                        <button
                            onClick={handleWeeklyAnalysis}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.6 : 1,
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#059669')}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                        >
                            {isLoading && viewMode === 'weekly' ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Loader size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
                                    読み込み中...
                                </span>
                            ) : '分析を表示'}
                        </button>
                    </div>

                    {/* 月次クリーンアップ */}
                    <div style={{
                        backgroundColor: '#1e293b',
                        padding: '2rem',
                        borderRadius: '12px',
                        border: '1px solid #334155',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <Trash2 size={32} color="#ef4444" />
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                marginLeft: '0.75rem',
                                color: '#f1f5f9'
                            }}>
                                🗑️ 月次クリーンアップ
                            </h3>
                        </div>
                        <p style={{
                            color: '#94a3b8',
                            marginBottom: '1.5rem',
                            lineHeight: '1.6'
                        }}>
                            30日以上前のログを削除してデータベース容量を管理します。
                        </p>
                        <button
                            onClick={handleMonthlyCleanup}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.6 : 1,
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#dc2626')}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                        >
                            {isLoading && viewMode === null ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Loader size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
                                    削除中...
                                </span>
                            ) : 'ログを削除'}
                        </button>
                    </div>
                </div>

                {/* 表示エリア */}
                {viewMode === 'daily' && <DailyLogsView logs={recentLogs} />}
                {viewMode === 'weekly' && <WeeklyAnalysisView data={analysisData} />}

                {cleanupResult && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        backgroundColor: '#064e3b',
                        border: '2px solid #10b981',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <p style={{
                            fontSize: '1.125rem',
                            color: '#6ee7b7',
                            fontWeight: 'bold'
                        }}>
                            ✅ {cleanupResult.message}
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
