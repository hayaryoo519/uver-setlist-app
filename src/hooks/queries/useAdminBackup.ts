import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'

export interface BackupFile {
  filename: string
  size: number
  created_at: string
}

export const useBackupList = () =>
  useQuery({
    queryKey: ['admin', 'backups'],
    queryFn: async () => {
      const data: any = await apiClient.get('/api/admin/backups')
      return data.backups as BackupFile[]
    },
    staleTime: 30_000,
  })

export const useRunBackup = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const data: any = await apiClient.post('/api/admin/backup', {})
      return data as { success: boolean; filename: string | null; message: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] })
    },
  })
}
