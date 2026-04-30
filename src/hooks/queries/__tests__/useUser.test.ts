import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createWrapper } from '../../../test/utils'
import { mockLives } from '../../../test/mocks/data'
import { useAttendedLives } from '../useUser'

describe('useAttendedLives', () => {
  it('参加ライブ一覧を取得する', async () => {
    const { result } = renderHook(() => useAttendedLives(true), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(mockLives.length)
  })

  it('enabled: false のときフェッチしない', () => {
    const { result } = renderHook(() => useAttendedLives(false), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })

  it('API エラー時に isError になる', async () => {
    server.use(
      http.get('/api/users/me/attended_lives', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      )
    )
    const { result } = renderHook(() => useAttendedLives(true), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
