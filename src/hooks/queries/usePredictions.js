import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES, queryClient } from '../../lib/queryClient'

export const usePredictableLives = () =>
  useQuery({
    queryKey: ['predictions', 'lives'],
    queryFn: () => apiClient.get('/api/predictions/lives'),
    staleTime: STALE_TIMES.predictions,
  })

export const usePredictions = (params = {}) => {
  const { enabled, ...queryParams } = params
  const searchParams = new URLSearchParams()
  if (queryParams.liveId) searchParams.set('live_id', queryParams.liveId)
  if (queryParams.sort) searchParams.set('sort', queryParams.sort)
  if (queryParams.mine) searchParams.set('mine', 'true')

  return useQuery({
    queryKey: queryKeys.predictions.all(queryParams),
    queryFn: () => apiClient.get(`/api/predictions?${searchParams.toString()}`),
    staleTime: STALE_TIMES.predictions,
    enabled: enabled !== false,
  })
}

export const useLikePrediction = () =>
  useMutation({
    mutationFn: (predictionId) =>
      apiClient.post(`/api/predictions/${predictionId}/like`),
    onSuccess: (_data, predictionId) => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] })
    },
  })

export const useCreatePrediction = () =>
  useMutation({
    mutationFn: (body) => apiClient.post('/api/predictions', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] })
    },
  })
