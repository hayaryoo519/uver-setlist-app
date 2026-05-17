import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { TrendingUp, Calendar, Clock, Zap } from 'lucide-react';
import { useSongPerformanceTimeline } from '../../hooks/queries/useSongPerformanceTimeline';
import type { YearlyPerformanceEntry } from '../../types/api';

// ============================================================
// 型定義
// ============================================================
interface Props {
  /** 楽曲 ID またはタイトルスラッグ */
  songId: string | number | undefined;
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * 演奏回数に応じたバー色を返す（対数スケール）
 * 線形補間だと CORE PRIDE (150回) vs レア曲 (2回) で
 * 低頻度年のバーが潰れるため対数スケールを採用
 */
const getBarColor = (count: number, maxCount: number): string => {
  if (count === 0 || maxCount === 0) return '#1e293b'; // slate-900（0件）
  const ratio = Math.log(count + 1) / Math.log(maxCount + 1);
  // slate-600 (#475569) → blue-500 (#3b82f6) へのグラデーション
  const r = Math.round(71  + ratio * (59  - 71));
  const g = Math.round(85  + ratio * (130 - 85));
  const b = Math.round(105 + ratio * (246 - 105));
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * 日数を「○年○ヶ月」形式にフォーマット
 */
const formatDays = (days: number): string => {
  const years  = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0 && months > 0) return `${years}年${months}ヶ月`;
  if (years > 0) return `${years}年`;
  if (months > 0) return `${months}ヶ月`;
  return `${days}日`;
};

// ============================================================
// カスタムツールチップ（tourLabel は API 側で生成済みのため join 不要）
// ============================================================
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const entry: YearlyPerformanceEntry = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm shadow-xl min-w-[160px]">
      <div className="font-bold text-white mb-1">{entry.year}年</div>
      <div className="text-blue-400 font-oswald text-lg">{entry.count}回</div>
      {entry.tourLabel && (
        <div className="text-slate-400 mt-1 text-xs leading-relaxed">
          {entry.tourLabel}
        </div>
      )}
      {entry.count === 0 && (
        <div className="text-slate-600 text-xs mt-1">披露なし</div>
      )}
    </div>
  );
};

// ============================================================
// メタデータカード
// ============================================================
interface MetaCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}

const MetaCard: React.FC<MetaCardProps> = ({ label, value, sub, highlight, icon }) => (
  <div className={`rounded-lg p-3 border ${
    highlight
      ? 'bg-amber-900/20 border-amber-500/30 text-amber-400'
      : 'bg-slate-800/60 border-slate-700/50'
  }`}>
    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-widest mb-1">
      {icon}
      {label}
    </div>
    <div className={`font-bold font-oswald text-base ${highlight ? 'text-amber-300' : 'text-white'}`}>
      {value}
    </div>
    {sub && <div className="text-slate-500 text-[10px] mt-0.5 font-mono">{sub}</div>}
  </div>
);

// ============================================================
// メインコンポーネント
// ============================================================
const SongYearlyPerformanceChart: React.FC<Props> = ({ songId }) => {
  const { data, isLoading, isError } = useSongPerformanceTimeline(songId);

  // ローディング中
  if (isLoading) {
    return (
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-6 animate-pulse">
        <div className="h-48 bg-slate-700/40 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-700/40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // エラー時は非表示（SongDetail.tsx 側のメインエラー表示に任せる）
  if (isError || !data) return null;

  const {
    yearlyData,
    firstPerformedAt,
    lastPerformedAt,
    longestGapDays,
    longestGapStart,
    longestGapEnd,
    currentGapDays,
    peakYear,
    peakCount,
    avgYearlyCount,
    consecutiveYears,
    totalPerformances,
  } = data;

  // 演奏実績がない場合は非表示
  if (totalPerformances === 0) return null;

  const maxCount = Math.max(...yearlyData.map(y => y.count), 1);

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-6">

      {/* ===== バーチャート ===== */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={yearlyData}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          barCategoryGap="20%"
        >
          <XAxis
            dataKey="year"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={yearlyData.length > 15 ? Math.floor(yearlyData.length / 8) : 0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {yearlyData.map((entry) => (
              <Cell
                key={`cell-${entry.year}`}
                fill={getBarColor(entry.count, maxCount)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* ===== メタデータ帯 ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <MetaCard
          label="初披露"
          value={firstPerformedAt ?? '─'}
          icon={<Calendar size={10} />}
        />
        <MetaCard
          label="最終披露"
          value={lastPerformedAt ?? '─'}
          icon={<Calendar size={10} />}
        />
        <MetaCard
          label="最長未披露期間"
          value={longestGapDays ? formatDays(longestGapDays) : '─'}
          sub={
            longestGapStart && longestGapEnd
              ? `${longestGapStart} 〜 ${longestGapEnd}`
              : undefined
          }
          icon={<Clock size={10} />}
        />
        <MetaCard
          label="現在未披露"
          value={currentGapDays ? formatDays(currentGapDays) : '─'}
          highlight={currentGapDays !== null && currentGapDays > 365}
          icon={<Clock size={10} />}
        />
      </div>

      {/* ===== 演奏密度メタ ===== */}
      {(peakYear || avgYearlyCount || consecutiveYears) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-slate-500">
          {peakYear && peakCount && (
            <span className="flex items-center gap-1">
              <Zap size={11} className="text-yellow-500" />
              最多: <b className="text-slate-300 ml-0.5">{peakYear}年 ({peakCount}回)</b>
            </span>
          )}
          {avgYearlyCount !== null && avgYearlyCount > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp size={11} className="text-blue-400" />
              平均: <b className="text-slate-300 ml-0.5">{avgYearlyCount}回/年</b>
            </span>
          )}
          {consecutiveYears && consecutiveYears > 1 && (
            <span className="flex items-center gap-1">
              🔥 連続披露: <b className="text-slate-300 ml-0.5">{consecutiveYears}年</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SongYearlyPerformanceChart;
