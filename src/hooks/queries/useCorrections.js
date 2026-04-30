import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'

export const useSubmitCorrection = () =>
  useMutation({
    mutationFn: (body) => apiClient.post('/api/corrections', body),
  })
