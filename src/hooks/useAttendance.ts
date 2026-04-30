import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAttendedLives, useAddAttendance, useRemoveAttendance } from './queries/useUser'

export const useAttendance = () => {
  const { currentUser } = useAuth()
  const { data: attendedLives = [], isLoading } = useAttendedLives(!!currentUser)
  const addMutation = useAddAttendance()
  const removeMutation = useRemoveAttendance()

  const attendedIds = useMemo(
    () => new Set(attendedLives.map((live) => live.id)),
    [attendedLives]
  )

  const addLive = async (liveId: number | string): Promise<boolean> => {
    try {
      await addMutation.mutateAsync(Number(liveId))
      return true
    } catch (err) {
      console.error('Failed to add live:', err)
      return false
    }
  }

  const removeLive = async (liveId: number | string): Promise<boolean> => {
    try {
      await removeMutation.mutateAsync(Number(liveId))
      return true
    } catch (err) {
      console.error('Failed to remove live:', err)
      return false
    }
  }

  const isAttended = (liveId: number | string): boolean =>
    attendedIds.has(Number(liveId))

  return {
    attendedIds,
    loading: isLoading,
    addLive,
    removeLive,
    isAttended,
    isPending: addMutation.isPending || removeMutation.isPending,
  }
}
