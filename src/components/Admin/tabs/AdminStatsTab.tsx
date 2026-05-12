import React from 'react'
import { Loader, Users, TrendingUp, Calendar, CheckSquare, AlertTriangle, Activity } from 'lucide-react'
import { useAdminStats } from '../../../hooks/queries/useAdminStats'

const StatCard = ({
  icon,
  label,
  value,
  sub,
  color = '#d4af37',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
}) => (
  <div style={{ background: '#1a1a1a', border: '1px solid #374151', borderRadius: '8px', padding: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
      {icon} {label}
    </div>
    <div style={{ color, fontSize: '32px', fontFamily: 'Oswald', fontWeight: 700, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>{sub}</div>}
  </div>
)

const MiniBar = ({ data, color = '#d4af37' }: { data: Array<{ date: string; count: number }>; color?: string }) => {
  if (!data.length) return <div style={{ color: '#94a3b8', fontSize: '13px' }}>データなし</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '48px' }}>
      {data.map(d => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count}件`}
          style={{
            flex: 1,
            background: color,
            opacity: 0.7,
            height: `${Math.max(4, (d.count / max) * 48)}px`,
            borderRadius: '2px 2px 0 0',
            minWidth: '4px',
          }}
        />
      ))}
    </div>
  )
}

const AdminStatsTab = () => {
  const { data, isLoading, error } = useAdminStats()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader className="spin" size={32} color="var(--primary-color)" />
      </div>
    )
  }

  if (error || !data) {
    return <div style={{ color: '#fca5a5', padding: '20px' }}>統計データの取得に失敗しました</div>
  }

  return (
    <div className="tab-content fade-in">
      <h3 style={{ color: '#94a3b8', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '16px' }}>ユーザー</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <StatCard icon={<Users size={14} />} label="累計ユーザー数" value={data.users.total_users.toLocaleString()} />
        <StatCard icon={<TrendingUp size={14} />} label="新規（直近30日）" value={data.users.new_users_30d} color="#86efac" />
        <StatCard icon={<TrendingUp size={14} />} label="新規（直近7日）" value={data.users.new_users_7d} color="#86efac" />
        <StatCard icon={<Activity size={14} />} label="アクティブ（30日）" value={data.activeUsers.active_30d} sub={`7日: ${data.activeUsers.active_7d}人`} color="#60a5fa" />
      </div>

      <h3 style={{ color: '#94a3b8', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '16px' }}>予想・参戦記録</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <StatCard icon={<CheckSquare size={14} />} label="累計予想数" value={data.predictions.total_predictions.toLocaleString()} />
        <StatCard icon={<TrendingUp size={14} />} label="予想（直近30日）" value={data.predictions.new_predictions_30d} color="#86efac" />
        <StatCard icon={<Calendar size={14} />} label="累計参戦記録" value={data.attendance.total_attendance.toLocaleString()} />
        <StatCard icon={<Users size={14} />} label="参戦記録ユーザー数" value={data.attendance.users_with_attendance} color="#a78bfa" />
      </div>

      <h3 style={{ color: '#94a3b8', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '16px' }}>修正依頼</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <StatCard icon={<AlertTriangle size={14} />} label="未処理" value={data.corrections.pending_corrections} color={data.corrections.pending_corrections > 0 ? '#fca5a5' : '#86efac'} />
        <StatCard icon={<CheckSquare size={14} />} label="解決済み" value={data.corrections.resolved_corrections} color="#86efac" />
        <StatCard icon={<AlertTriangle size={14} />} label="累計" value={data.corrections.total_corrections} color="#94a3b8" />
      </div>

      <h3 style={{ color: '#94a3b8', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '12px' }}>直近30日のトレンド</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#1a1a1a', border: '1px solid #374151', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '10px' }}>新規ユーザー登録</div>
          <MiniBar data={data.dailyRegistrations} color="#d4af37" />
        </div>
        <div style={{ background: '#1a1a1a', border: '1px solid #374151', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '10px' }}>予想投稿数</div>
          <MiniBar data={data.dailyPredictions} color="#60a5fa" />
        </div>
      </div>
    </div>
  )
}

export default AdminStatsTab
