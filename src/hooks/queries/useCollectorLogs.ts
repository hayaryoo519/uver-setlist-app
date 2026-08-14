import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'

export const useCollectorLogs = (limit = 10) =>
  useQuery({
    queryKey: [...queryKeys.admin.collectorLogs, limit],
    queryFn: async () => {
      const data: any = await apiClient.get(`/api/logs/collector?limit=${limit}`)
      return data.logs as any[]
    },
    staleTime: 30_000,
  })
