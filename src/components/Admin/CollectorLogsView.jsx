import React, { useMemo } from 'react';
import { AlertCircle, Info, AlertTriangle, Clock, Download, Filter, FileText, XCircle, Layers, Search } from 'lucide-react';

const X_COLLECTION_MESSAGE = 'X collection finished';

/**
 * X 収集ログの details から件数を取り出す
 * 収集の各段階: fetched（取得） → candidates（候補） → created/grouped（ドラフト化）
 */
function toStats(details) {
    const d = details || {};
    return {
        fetched: Number(d.fetched) || 0,
        candidates: Number(d.candidates) || 0,
        lowMatch: Number(d.lowMatch) || 0,
        created: Number(d.created) || 0,
        grouped: Number(d.grouped) || 0,
        errors: Number(d.errors) || 0,
    };
}

function sumStats(logs) {
    return logs.reduce((acc, log) => {
        const s = toStats(log.details);
        Object.keys(acc).forEach((k) => { acc[k] += s[k]; });
        return acc;
    }, { fetched: 0, candidates: 0, lowMatch: 0, created: 0, grouped: 0, errors: 0 });
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

const CARD = { background: '#1e293b', borderRadius: '10px', border: '1px solid #334155' };

/**
 * 収集ファネルの1段を表すバー
 */
function FunnelBar({ label, value, total, color, icon, note }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '150px', flexShrink: 0, fontSize: '13px', color: '#cbd5e1' }}>
                <span style={{ color, display: 'flex' }}>{icon}</span>
                {label}
            </div>
            <div style={{ flex: 1, minWidth: 0, background: '#0f172a', borderRadius: '6px', height: '26px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, opacity: 0.35, transition: 'width .3s' }} />
                <span style={{ position: 'absolute', left: '10px', top: 0, lineHeight: '26px', fontSize: '12px', color: '#f1f5f9', fontWeight: 600 }}>
                    {value.toLocaleString()}
                    {note && <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '8px' }}>{note}</span>}
                </span>
            </div>
            <span style={{ width: '48px', textAlign: 'right', fontSize: '12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        </div>
    );
}

function StatTile({ label, value, color }) {
    return (
        <div style={{ ...CARD, padding: '12px 14px', flex: '1 1 110px', minWidth: '110px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                {value.toLocaleString()}
            </div>
        </div>
    );
}

/**
 * X 収集の集計ダッシュボード
 */
function CollectionSummary({ logs }) {
    const total = sumStats(logs);
    const drafts = total.created + total.grouped;
    // 候補まで残った投稿のうち、実際にドラフトになった割合
    const precision = total.candidates > 0 ? Math.round((drafts / total.candidates) * 100) : 0;
    const lastRun = logs[0]?.created_at;

    return (
        <div style={{ ...CARD, padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '15px' }}>
                    <Search size={18} /> X 収集サマリー
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>直近 {logs.length} 回の実行</span>
                </h3>
                {lastRun && <span style={{ fontSize: '12px', color: '#94a3b8' }}>最終実行: {formatDate(lastRun)}</span>}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <StatTile label="作成ドラフト" value={total.created} color="#10b981" />
                <StatTile label="既存へ統合" value={total.grouped} color="#3b82f6" />
                <StatTile label="一致率で除外" value={total.lowMatch} color="#f59e0b" />
                <StatTile label="エラー" value={total.errors} color={total.errors > 0 ? '#ef4444' : '#64748b'} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <FunnelBar label="取得した投稿" value={total.fetched} total={total.fetched}
                    color="#3b82f6" icon={<Download size={14} />} />
                <FunnelBar label="セトリ候補" value={total.candidates} total={total.fetched}
                    color="#8b5cf6" icon={<Filter size={14} />} note="GPT判定・曲数・一致率を通過" />
                <FunnelBar label="ドラフト化" value={drafts} total={total.fetched}
                    color="#10b981" icon={<FileText size={14} />} note={`新規 ${total.created} / 統合 ${total.grouped}`} />
            </div>

            {total.candidates > 0 && (
                <div style={{ marginTop: '14px', fontSize: '12px', color: '#94a3b8' }}>
                    候補のうち {precision}% がドラフトになりました。
                    {total.lowMatch > 0 && ` 曲マスタ一致率が低い ${total.lowMatch} 件は他アーティストのセトリとして除外しています。`}
                </div>
            )}
            {total.fetched > 0 && total.candidates === 0 && (
                <div style={{ marginTop: '14px', fontSize: '12px', color: '#f59e0b' }}>
                    投稿は取得できていますが、セトリ候補が0件です。対象公演のセトリがまだ投稿されていないか、フィルタが厳しすぎる可能性があります。
                </div>
            )}
            {total.fetched === 0 && (
                <div style={{ marginTop: '14px', fontSize: '12px', color: '#f59e0b' }}>
                    投稿を1件も取得できていません。twitter-cli の認証（Cookie の失効）を確認してください。
                </div>
            )}
        </div>
    );
}

/**
 * SNS収集ログを表示するためのコンポーネント
 * @param {object[]} logs - collector_logs テーブルのレコード配列
 */
export default function CollectorLogsView({ logs }) {
    const collectionLogs = useMemo(
        () => (logs || []).filter((l) => l.message === X_COLLECTION_MESSAGE),
        [logs]
    );

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
            {collectionLogs.length > 0 && <CollectionSummary logs={collectionLogs} />}

            <div className="table-header-panel">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Clock size={20} /> SNS収集ログ ({logs.length}件)
                </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.map((log) => {
                    const { color, icon, bg } = getLevelInfo(log.level);
                    const isCollection = log.message === X_COLLECTION_MESSAGE;
                    const stats = isCollection ? toStats(log.details) : null;

                    return (
                        <div key={log.id} style={{ ...CARD, border: `1px solid ${log.level === 'error' ? '#ef444440' : '#334155'}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

                            {isCollection ? (
                                <>
                                    {log.details?.query && (
                                        <div style={{ fontSize: '13px', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Search size={13} color="#64748b" />
                                            <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>{log.details.query}</code>
                                            {log.details.liveId && <span style={{ fontSize: '11px', color: '#64748b' }}>live #{log.details.liveId}</span>}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: '#94a3b8' }}>
                                        <span><Download size={12} style={{ verticalAlign: '-1px' }} /> 取得 <b style={{ color: '#f1f5f9' }}>{stats.fetched}</b></span>
                                        <span><Filter size={12} style={{ verticalAlign: '-1px' }} /> 候補 <b style={{ color: '#f1f5f9' }}>{stats.candidates}</b></span>
                                        {stats.lowMatch > 0 && <span><XCircle size={12} style={{ verticalAlign: '-1px' }} /> 一致率除外 <b style={{ color: '#f59e0b' }}>{stats.lowMatch}</b></span>}
                                        <span><FileText size={12} style={{ verticalAlign: '-1px' }} /> 作成 <b style={{ color: '#10b981' }}>{stats.created}</b></span>
                                        {stats.grouped > 0 && <span><Layers size={12} style={{ verticalAlign: '-1px' }} /> 統合 <b style={{ color: '#3b82f6' }}>{stats.grouped}</b></span>}
                                        {stats.errors > 0 && <span><AlertCircle size={12} style={{ verticalAlign: '-1px' }} /> エラー <b style={{ color: '#ef4444' }}>{stats.errors}</b></span>}
                                    </div>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
