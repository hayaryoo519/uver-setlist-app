import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createWrapper } from '../../../test/utils'
import { mockLives } from '../../../test/mocks/data'
import { useAttendedLives, useAddAttendance, useRemoveAttendance } from '../useUser'

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

describe('useAddAttendance', () => {
  it('参加ライブを追加する', async () => {
    let postedBody: unknown
    server.use(
      http.post('/api/users/me/attended_lives', async ({ request }) => {
        postedBody = await request.json()
        return HttpResponse.json({ message: 'ok' })
      })
    )
    const { result } = renderHook(() => useAddAttendance(), { wrapper: createWrapper() })
    result.current.mutate(1)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(postedBody).toEqual({ liveId: 1 })
  })

  it('API エラー時に isError になる', async () => {
    server.use(
      http.post('/api/users/me/attended_lives', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      )
    )
    const { result } = renderHook(() => useAddAttendance(), { wrapper: createWrapper() })
    result.current.mutate(1)
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useRemoveAttendance', () => {
  it('参加ライブを削除する', async () => {
    let deletedId: string | undefined
    server.use(
      http.delete('/api/users/me/attended_lives/:id', ({ params }) => {
        deletedId = params.id as string
        return HttpResponse.json({ message: 'ok' })
      })
    )
    const { result } = renderHook(() => useRemoveAttendance(), { wrapper: createWrapper() })
    result.current.mutate(2)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deletedId).toBe('2')
  })

  it('API エラー時に isError になる', async () => {
    server.use(
      http.delete('/api/users/me/attended_lives/:id', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 })
      )
    )
    const { result } = renderHook(() => useRemoveAttendance(), { wrapper: createWrapper() })
    result.current.mutate(99)
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
