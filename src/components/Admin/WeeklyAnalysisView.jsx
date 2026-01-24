import React from 'react';

export default function WeeklyAnalysisView({ data }) {
    if (!data) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#94a3b8'
            }}>
                データを読み込んでいます...
            </div>
        );
    }

    const getStatValue = (eventType) => {
        const stat = data.stats.find(s => s.event_type === eventType);
        return stat ? parseInt(stat.count) : 0;
    };

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1.5rem',
                color: '#f1f5f9'
            }}>
                週間分析（過去7日間）
            </h2>

            {/* 統計カード */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{
                    backgroundColor: '#1e293b',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                }}>
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                    }}>
                        ログイン失敗
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: '#fbbf24'
                    }}>
                        {getStatValue('login_failed')}件
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1e293b',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                }}>
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                    }}>
                        今日の失敗
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: '#f59e0b'
                    }}>
                        {data.todayFailures}件
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1e293b',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                }}>
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                    }}>
                        エラー
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: '#ef4444'
                    }}>
                        {getStatValue('error')}件
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1e293b',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                }}>
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                    }}>
                        総ログ数
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: '#60a5fa'
                    }}>
                        {data.totalLogs}件
                    </div>
                </div>
            </div>

            {/* 疑わしいIP */}
            {data.suspiciousIPs && data.suspiciousIPs.length > 0 ? (
                <div style={{
                    backgroundColor: '#7f1d1d',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '2px solid #dc2626',
                    marginBottom: '2rem'
                }}>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        marginBottom: '1rem',
                        color: '#fca5a5'
                    }}>
                        ⚠️ 疑わしいIPアドレス（過去24時間で5回以上失敗）
                    </h3>
                    {data.suspiciousIPs.map((ip, index) => (
                        <div key={index} style={{
                            backgroundColor: '#991b1b',
                            padding: '1rem',
                            borderRadius: '6px',
                            marginBottom: index < data.suspiciousIPs.length - 1 ? '0.75rem' : '0',
                            border: '1px solid #dc2626'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem'
                            }}>
                                <span style={{
                                    fontFamily: 'monospace',
                                    color: '#fecaca',
                                    fontWeight: 'bold'
                                }}>
                                    IP: {ip.ip_address}
                                </span>
                                <span style={{
                                    color: '#fca5a5',
                                    fontWeight: 'bold'
                                }}>
                                    {ip.failed_attempts}回失敗
                                </span>
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#fecaca'
                            }}>
                                対象: {ip.targeted_emails.join(', ')}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{
                    backgroundColor: '#064e3b',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '2px solid #10b981',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>
                    <span style={{
                        fontSize: '1.125rem',
                        color: '#6ee7b7',
                        fontWeight: 'bold'
                    }}>
                        ✅ 疑わしいIPアドレスはありません
                    </span>
                </div>
            )}

            {/* 最も攻撃されているメールアドレス */}
            {data.targetedEmails && data.targetedEmails.length > 0 && (
                <div style={{
                    backgroundColor: '#1e293b',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                }}>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        marginBottom: '1rem',
                        color: '#f1f5f9'
                    }}>
                        🎯 最も攻撃されているメールアドレス
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #334155' }}>
                                    <th style={{
                                        padding: '0.75rem',
                                        textAlign: 'left',
                                        color: '#94a3b8',
                                        fontSize: '0.875rem'
                                    }}>順位</th>
                                    <th style={{
                                        padding: '0.75rem',
                                        textAlign: 'left',
                                        color: '#94a3b8',
                                        fontSize: '0.875rem'
                                    }}>メールアドレス</th>
                                    <th style={{
                                        padding: '0.75rem',
                                        textAlign: 'right',
                                        color: '#94a3b8',
                                        fontSize: '0.875rem'
                                    }}>攻撃回数</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.targetedEmails.map((email, index) => (
                                    <tr key={index} style={{
                                        borderBottom: index < data.targetedEmails.length - 1 ? '1px solid #334155' : 'none'
                                    }}>
                                        <td style={{
                                            padding: '0.75rem',
                                            color: '#cbd5e1'
                                        }}>
                                            {index + 1}
                                        </td>
                                        <td style={{
                                            padding: '0.75rem',
                                            color: '#e2e8f0'
                                        }}>
                                            {email.user_email}
                                        </td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'right',
                                            color: '#fbbf24',
                                            fontWeight: 'bold'
                                        }}>
                                            {email.attack_count}回
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
