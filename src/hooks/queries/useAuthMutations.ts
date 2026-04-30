import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email: string) =>
      apiClient.post('/api/auth/forgot-password', { email }),
  })

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      apiClient.post('/api/auth/reset-password', { token, password }),
  })

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: (token: string) =>
      apiClient.post('/api/auth/verify-email', { token }),
  })
