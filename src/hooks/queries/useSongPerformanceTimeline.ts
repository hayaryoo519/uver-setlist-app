import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import type { SongPerformanceTimelineData } from '../../types/api'

/**
 * 楽曲演奏推移タイムラインデータを取得する React Query フック
 *
 * 取得先: GET /api/songs/:id/performance-timeline
 * - 年別演奏回数の集計データ（欠番補完済み）
 * - longestGap / currentGapDays / 演奏密度メタデータ
 *
 * キャッシュ戦略:
 * - staleTime: 10分（セトリ追加直後に古いデータが残らないよう短めに設定）
 * - gcTime: 1時間（メモリ上には1時間保持）
 * - セトリ更新時は invalidateQueries(['song', id, 'performance-timeline']) で即時反映可能
 */
export const useSongPerformanceTimeline = (id: string | number | undefined) => {
  const encodedId = id
    ? encodeURIComponent(id.toString().replace(/\s+/g, ''))
    : null

  return useQuery({
    queryKey: [...queryKeys.songs.detail(id), 'performance-timeline'],
    queryFn: () =>
      apiClient.get<SongPerformanceTimelineData>(
        `/api/songs/${encodedId}/performance-timeline`
      ),
    staleTime: 1000 * 60 * 10,     // 10分
    gcTime:    1000 * 60 * 60,     // 1時間
    enabled: !!id,
  })
}
