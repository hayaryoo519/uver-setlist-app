import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'

export interface SecurityLog {
  id: number
  timestamp: string
  event_type: string
  message: string
  user_email: string | null
  ip_address: string | null
  details: any | null
}

export interface SecurityLogsResponse {
  logs: SecurityLog[]
  total: number
  page: number
  limit: number
}

export interface SecurityAnalysis {
  stats: Array<{ event_type: string; count: number; unique_ips: number }>
  todayFailures: number
  suspiciousIPs: Array<{
    ip_address: string
    failed_attempts: number
    targeted_emails: string[]
    first_attempt: string
    last_attempt: string
  }>
  targetedEmails: Array<{ user_email: string; attack_count: number }>
  totalLogs: number
}

interface UseSecurityLogsParams {
  page?: number
  limit?: number
  event_type?: string
  days?: number
}

export const useSecurityLogs = (params: UseSecurityLogsParams = {}) => {
  const { page = 1, limit = 50, event_type, days = 30 } = params
  const queryParams = { page, limit, event_type, days }

  return useQuery({
    queryKey: queryKeys.admin.securityLogs(queryParams),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      searchParams.set('page', String(page))
      searchParams.set('limit', String(limit))
      searchParams.set('days', String(days))
      if (event_type) searchParams.set('event_type', event_type)

      const data: any = await apiClient.get(`/api/logs/security?${searchParams}`)
      return data as SecurityLogsResponse
    },
    staleTime: 30_000,
  })
}

export const useSecurityAnalysis = () =>
  useQuery({
    queryKey: queryKeys.admin.securityAnalysis,
    queryFn: async () => {
      const data: any = await apiClient.get('/api/logs/analysis')
      return data as SecurityAnalysis
    },
    staleTime: 60_000,
  })
