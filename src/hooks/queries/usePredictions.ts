import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import { STALE_TIMES, queryClient } from '../../lib/queryClient'
import type { Live, Prediction, CreatePredictionInput, PredictionsParams } from '../../types/api'

export const usePredictableLives = () =>
  useQuery({
    queryKey: ['predictions', 'lives'],
    queryFn: () => apiClient.get<Live[]>('/api/predictions/lives'),
    staleTime: STALE_TIMES.predictions,
  })

export const usePredictions = (params: PredictionsParams = {}) => {
  const { enabled, ...queryParams } = params
  const searchParams = new URLSearchParams()
  if (queryParams.liveId) searchParams.set('live_id', String(queryParams.liveId))
  if (queryParams.sort) searchParams.set('sort', queryParams.sort)
  if (queryParams.mine) searchParams.set('mine', 'true')

  return useQuery({
    queryKey: queryKeys.predictions.all(queryParams as Record<string, unknown>),
    queryFn: () => apiClient.get<Prediction[]>(`/api/predictions?${searchParams.toString()}`),
    staleTime: STALE_TIMES.predictions,
    enabled: enabled !== false,
  })
}

export const useLikePrediction = () =>
  useMutation({
    mutationFn: (predictionId: number | string) =>
      apiClient.post(`/api/predictions/${predictionId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] })
    },
  })

export const useCreatePrediction = () =>
  useMutation({
    mutationFn: (body: CreatePredictionInput) => apiClient.post<Prediction>('/api/predictions', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] })
    },
  })
