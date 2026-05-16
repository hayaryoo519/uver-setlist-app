import React, { useState } from 'react'
import { Loader, ShieldAlert, AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSecurityLogs, useSecurityAnalysis } from '../../../hooks/queries/useSecurityLogs'

const EVENT_TYPES = [
  { value: '', label: 'すべて' },
  { value: 'login_failed', label: 'ログイン失敗' },
  { value: 'login_success', label: 'ログイン成功' },
  { value: 'error', label: 'エラー' },
]

const DAYS_OPTIONS = [
  { value: 7,  label: '直近7日' },
  { value: 30, label: '直近30日' },
  { value: 90, label: '直近90日' },
]

const eventBadge = (type: string) => {
  switch (type) {
    case 'login_failed':
      return <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>失敗</span>
    case 'login_success':
      return <span style={{ background: '#14532d', color: '#86efac', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>成功</span>
    default:
      return <span style={{ background: '#1e3a5f', color: '#93c5fd', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{type}</span>
  }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const AdminSecurityLogsTab = () => {
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState('')
  const [days, setDays] = useState(30)

  const { data, isLoading } = useSecurityLogs({ page, limit: 50, event_type: eventType || undefined, days })
  const { data: analysis } = useSecurityAnalysis()

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  const handleFilterChange = (newType: string, newDays: number) => {
    setEventType(newType)
    setDays(newDays)
    setPage(1)
  }

  return (
    <div className="tab-content fade-in">
      {/* サマリーカード */}
      {analysis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '16px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>今日のログイン失敗</div>
            <div style={{ color: '#fca5a5', fontSize: '28px', fontFamily: 'Oswald', fontWeight: 700 }}>{analysis.todayFailures}</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #374151', borderRadius: '8px', padding: '16px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>不審なIP（24h）</div>
            <div style={{ color: analysis.suspiciousIPs.length > 0 ? '#fbbf24' : '#f0f0f0', fontSize: '28px', fontFamily: 'Oswald', fontWeight: 700 }}>
              {analysis.suspiciousIPs.length}
            </div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #374151', borderRadius: '8px', padding: '16px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>総ログ件数</div>
            <div style={{ color: '#f0f0f0', fontSize: '28px', fontFamily: 'Oswald', fontWeight: 700 }}>{analysis.totalLogs.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* 不審なIP */}
      {analysis && analysis.suspiciousIPs.length > 0 && (
        <div style={{ background: '#1a1a1a', border: '1px solid #78350f', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', marginBottom: '12px', fontWeight: 600 }}>
            <AlertTriangle size={16} /> 不審なIPアドレス（過去24時間で5回以上失敗）
          </div>
          {analysis.suspiciousIPs.map(ip => (
            <div key={ip.ip_address} style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#cbd5e1', padding: '6px 0', borderBottom: '1px solid #374151' }}>
              <span style={{ color: '#fbbf24', fontFamily: 'monospace', minWidth: '130px' }}>{ip.ip_address}</span>
              <span style={{ color: '#fca5a5' }}>{ip.failed_attempts}回失敗</span>
              <span style={{ color: '#94a3b8' }}>{ip.targeted_emails.slice(0, 2).join(', ')}{ip.targeted_emails.length > 2 ? ' ...' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* フィルタ */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select
          value={eventType}
          onChange={e => handleFilterChange(e.target.value, days)}
          style={{ background: '#1a1a1a', color: '#f0f0f0', border: '1px solid #374151', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' }}
        >
          {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={days}
          onChange={e => handleFilterChange(eventType, Number(e.target.value))}
          style={{ background: '#1a1a1a', color: '#f0f0f0', border: '1px solid #374151', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' }}
        >
          {DAYS_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        {data && <span style={{ color: '#94a3b8', fontSize: '13px', alignSelf: 'center' }}>全{data.total.toLocaleString()}件</span>}
      </div>

      {/* ログ一覧 */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader className="spin" size={32} color="var(--primary-color)" />
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: '#94a3b8', borderBottom: '1px solid #374151' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>日時</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>種別</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>メールアドレス</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>IPアドレス</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>メッセージ</th>
                </tr>
              </thead>
              <tbody>
                {(data?.logs ?? []).map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #1f2937', color: '#cbd5e1' }}>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontFamily: 'monospace', color: '#94a3b8' }}>{formatDate(log.timestamp)}</td>
                    <td style={{ padding: '8px 12px' }}>{eventBadge(log.event_type)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px' }}>{log.user_email ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px' }}>{log.ip_address ?? '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ background: 'none', border: '1px solid #374151', color: page === 1 ? '#4b5563' : '#f0f0f0', borderRadius: '6px', padding: '6px 10px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ background: 'none', border: '1px solid #374151', color: page === totalPages ? '#4b5563' : '#f0f0f0', borderRadius: '6px', padding: '6px 10px', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminSecurityLogsTab
