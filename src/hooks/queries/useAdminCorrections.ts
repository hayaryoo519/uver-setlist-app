import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import type { Correction, CorrectionInput } from '../../types/api'

export const useAdminCorrections = () =>
  useQuery({
    queryKey: queryKeys.admin.corrections,
    queryFn: async () => {
      const data: any = await apiClient.get('/api/corrections')
      return data.corrections as Correction[]
    },
  })

export const useUpdateCorrectionStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, admin_note }: { id: number; status: string; admin_note?: string }) =>
      apiClient.patch(`/api/corrections/${id}`, { status, admin_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.corrections })
    },
  })
}

export const useSubmitCorrection = () =>
  useMutation({
    mutationFn: (body: CorrectionInput) => apiClient.post<Correction>('/api/corrections', body),
  })
