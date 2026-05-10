import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'

export const useCollectorLogs = () =>
  useQuery({
    queryKey: queryKeys.admin.collectorLogs,
    queryFn: async () => {
      const data: any = await apiClient.get('/api/logs/collector')
      return data.logs as any[]
    },
    staleTime: 30_000,
  })
