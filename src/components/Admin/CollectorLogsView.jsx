import React from 'react';
import { AlertCircle, Info, AlertTriangle, Clock } from 'lucide-react';

/**
 * SNS収集ログを表示するためのコンポーネント
 * @param {object[]} logs - collector_logs テーブルのレコード配列
 */
export default function CollectorLogsView({ logs }) {
    const getLevelInfo = (level) => {
        switch (level) {
            case 'error':
                return { color: '#ef4444', icon: <AlertCircle size={16} />, bg: 'rgba(239, 68, 68, 0.1)' };
            case 'warn':
                return { color: '#f59e0b', icon: <AlertTriangle size={16} />, bg: 'rgba(245, 158, 11, 0.1)' };
            case 'info':
                return { color: '#3b82f6', icon: <Info size={16} />, bg: 'rgba(59, 130, 246, 0.1)' };
            default:
                return { color: '#94a3b8', icon: <Clock size={16} />, bg: 'rgba(148, 163, 184, 0.1)' };
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    if (!logs || logs.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#1e293b', borderRadius: '12px', border: '1px dashed #334155' }}>
                <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>収集ログがありません</p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="table-header-panel">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Clock size={20} /> SNS収集ログ (最新10件)
                </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.map((log) => {
                    const { color, icon, bg } = getLevelInfo(log.level);
                    return (
                        <div key={log.id} style={{
                            background: '#1e293b',
                            borderRadius: '10px',
                            border: `1px solid ${log.level === 'error' ? '#ef444440' : '#334155'}`,
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ 
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                                        padding: '2px 8px', borderRadius: '4px', background: bg, color: color
                                    }}>
                                        {icon} {log.level}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>#{log.id}</span>
                                </div>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDate(log.created_at)}</span>
                            </div>

                            <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500', lineHeight: '1.5' }}>
                                {log.message}
                            </div>

                            {log.details && Object.keys(log.details).length > 0 && (
                                <div style={{ 
                                    marginTop: '8px', padding: '10px', background: '#0f172a', 
                                    borderRadius: '6px', fontSize: '12px', color: '#94a3b8',
                                    fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap'
                                }}>
                                    {JSON.stringify(log.details, null, 2)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
