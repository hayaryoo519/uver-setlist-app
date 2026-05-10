import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import { queryKeys } from '../../lib/queryKeys'
import type { User } from '../../types/api'

export const useAdminUsers = () =>
  useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: () => apiClient.get<User[]>('/api/users'),
  })

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => apiClient.delete(`/api/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
    },
  })
}

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      apiClient.put(`/api/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
    },
  })
}

export const useRestoreUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => apiClient.patch(`/api/users/${userId}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
    },
  })
}
