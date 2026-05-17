import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'

export interface AdminStats {
  users: {
    total_users: number
    new_users_30d: number
    new_users_7d: number
    public_users: number
  }
  predictions: {
    total_predictions: number
    new_predictions_30d: number
    new_predictions_7d: number
    users_with_predictions: number
  }
  attendance: {
    total_attendance: number
    new_attendance_30d: number
    users_with_attendance: number
  }
  activeUsers: {
    active_7d: number
    active_30d: number
  }
  corrections: {
    total_corrections: number
    pending_corrections: number
    resolved_corrections: number
  }
  dailyRegistrations: Array<{ date: string; count: number }>
  dailyPredictions: Array<{ date: string; count: number }>
}

export const useAdminStats = () =>
  useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: async () => {
      const data: any = await apiClient.get('/api/stats?admin=true')
      return data as AdminStats
    },
    staleTime: 60_000,
  })
