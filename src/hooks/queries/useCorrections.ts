import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import type { Correction, CorrectionInput } from '../../types/api'

export const useSubmitCorrection = () =>
  useMutation({
    mutationFn: (body: CorrectionInput) => apiClient.post<Correction>('/api/corrections', body),
  })
