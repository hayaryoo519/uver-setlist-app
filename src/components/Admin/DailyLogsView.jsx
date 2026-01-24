import React from 'react';

export default function DailyLogsView({ logs }) {
    const getEventColor = (eventType) => {
        switch (eventType) {
            case 'error':
                return 'text-red-400';
            case 'login_failed':
                return 'text-yellow-400';
            case 'suspicious':
                return 'text-purple-400';
            default:
                return 'text-gray-400';
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    if (!logs || logs.length === 0) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#94a3b8'
            }}>
                ログがありません
            </div>
        );
    }

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                color: '#f1f5f9'
            }}>
                最新10件のログ
            </h2>

            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: '#334155',
                            borderBottom: '2px solid #475569'
                        }}>
                            <th style={{
                                padding: '1rem',
                                textAlign: 'left',
                                color: '#f1f5f9',
                                fontWeight: '600'
                            }}>時刻</th>
                            <th style={{
                                padding: '1rem',
                                textAlign: 'left',
                                color: '#f1f5f9',
                                fontWeight: '600'
                            }}>タイプ</th>
                            <th style={{
                                padding: '1rem',
                                textAlign: 'left',
                                color: '#f1f5f9',
                                fontWeight: '600'
                            }}>メッセージ</th>
                            <th style={{
                                padding: '1rem',
                                textAlign: 'left',
                                color: '#f1f5f9',
                                fontWeight: '600'
                            }}>メール</th>
                            <th style={{
                                padding: '1rem',
                                textAlign: 'left',
                                color: '#f1f5f9',
                                fontWeight: '600'
                            }}>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log, index) => (
                            <tr key={log.id} style={{
                                borderBottom: index < logs.length - 1 ? '1px solid #334155' : 'none'
                            }}>
                                <td style={{
                                    padding: '0.75rem 1rem',
                                    color: '#cbd5e1',
                                    fontSize: '0.875rem'
                                }}>
                                    {formatDate(log.timestamp)}
                                </td>
                                <td style={{
                                    padding: '0.75rem 1rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '600'
                                }} className={getEventColor(log.event_type)}>
                                    {log.event_type}
                                </td>
                                <td style={{
                                    padding: '0.75rem 1rem',
                                    color: '#e2e8f0',
                                    fontSize: '0.875rem'
                                }}>
                                    {log.message}
                                </td>
                                <td style={{
                                    padding: '0.75rem 1rem',
                                    color: '#94a3b8',
                                    fontSize: '0.875rem'
                                }}>
                                    {log.user_email || '-'}
                                </td>
                                <td style={{
                                    padding: '0.75rem 1rem',
                                    color: '#94a3b8',
                                    fontSize: '0.875rem',
                                    fontFamily: 'monospace'
                                }}>
                                    {log.ip_address}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
