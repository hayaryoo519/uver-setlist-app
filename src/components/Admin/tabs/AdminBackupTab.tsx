import React, { useState } from 'react'
import { Database, Play, Loader, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { useBackupList, useRunBackup } from '../../../hooks/queries/useAdminBackup'

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

const AdminBackupTab = () => {
  const { data: backups = [], isLoading, refetch } = useBackupList()
  const { mutate: runBackup, isPending, isSuccess, isError, data: result, error } = useRunBackup()
  const [confirmed, setConfirmed] = useState(false)

  const handleRun = () => {
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    setConfirmed(false)
    runBackup()
  }

  return (
    <div className="tab-content fade-in">
      {/* 実行パネル */}
      <div style={{ background: '#1a1a1a', border: '1px solid #374151', borderRadius: '8px', padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Database size={20} color="#d4af37" />
          <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'Oswald' }}>DBバックアップ実行</h3>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
          本番DBのバックアップを即時実行します。完了まで数分かかる場合があります。
        </p>

        {confirmed && !isPending && (
          <div style={{ background: '#78350f20', border: '1px solid #78350f', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#fbbf24', fontSize: '13px' }}>
            もう一度ボタンを押すと実行されます。本当によいですか？
          </div>
        )}

        {isSuccess && result && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#14532d20', border: '1px solid #14532d', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#86efac', fontSize: '13px' }}>
            <CheckCircle size={16} /> {result.message}{result.filename ? ` — ${result.filename}` : ''}
          </div>
        )}

        {isError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7f1d1d20', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#fca5a5', fontSize: '13px' }}>
            <XCircle size={16} /> バックアップに失敗しました
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={isPending}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: confirmed ? '#b45309' : 'var(--primary-color)',
            color: '#0c0c0c', border: 'none', borderRadius: '6px',
            padding: '10px 20px', fontSize: '14px', fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? <Loader size={16} className="spin" /> : <Play size={16} />}
          {isPending ? '実行中...' : confirmed ? '確認：実行する' : 'バックアップ実行'}
        </button>
      </div>

      {/* バックアップ一覧 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '0.1em' }}>直近のバックアップ（最大20件）</h3>
        <button
          onClick={() => refetch()}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
        >
          <RefreshCw size={12} /> 更新
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader className="spin" size={28} color="var(--primary-color)" />
        </div>
      ) : backups.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
          バックアップファイルが見つかりません
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ color: '#94a3b8', borderBottom: '1px solid #374151' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>ファイル名</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500 }}>サイズ</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500 }}>作成日時</th>
            </tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.filename} style={{ borderBottom: '1px solid #1f2937', color: '#cbd5e1' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px' }}>{b.filename}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8' }}>{formatBytes(b.size)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatDate(b.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AdminBackupTab
