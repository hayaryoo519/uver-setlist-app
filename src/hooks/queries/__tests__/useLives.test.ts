import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createWrapper } from '../../../test/utils'
import { mockLives } from '../../../test/mocks/data'
import { useLives, useLiveDetail } from '../useLives'

describe('useLives', () => {
  it('ライブ一覧を取得して日付降順で返す', async () => {
    const { result } = renderHook(() => useLives(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const lives = result.current.data!
    expect(lives).toHaveLength(mockLives.length)
    // 降順ソート確認（最初の要素が最新）
    expect(new Date(lives[0].date).getTime()).toBeGreaterThan(
      new Date(lives[1].date).getTime()
    )
  })

  it('日付が不正なライブはフィルタリングされる', async () => {
    server.use(
      http.get('/api/lives', () =>
        HttpResponse.json([
          ...mockLives,
          { id: 99, tour_name: 'Broken', date: 'invalid-date', venue: 'X', type: 'ONEMAN', title: null, special_note: null },
          { id: 100, tour_name: 'Old', date: '1900-01-01T00:00:00.000Z', venue: 'Y', type: 'ONEMAN', title: null, special_note: null },
        ])
      )
    )
    const { result } = renderHook(() => useLives(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // invalid-date と 1900年はフィルタされる
    const ids = result.current.data!.map((l) => l.id)
    expect(ids).not.toContain(99)
    expect(ids).not.toContain(100)
  })

  it('tour_name パラメータを URL クエリに含める', async () => {
    let requestedUrl = ''
    server.use(
      http.get('/api/lives', ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json(mockLives)
      })
    )

    const { result } = renderHook(() => useLives({ tour_name: 'TOUR 2024' }), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(requestedUrl).toContain('tour_name=TOUR+2024')
  })

  it('enabled: false のときフェッチしない', () => {
    const { result } = renderHook(() => useLives({ enabled: false }), {
      wrapper: createWrapper(),
    })
    expect(result.current.isPending).toBe(true)
    expect(result.current.isFetching).toBe(false)
  })

  it('songIds パラメータを URL クエリに含める', async () => {
    let requestedUrl = ''
    server.use(
      http.get('/api/lives', ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json(mockLives)
      })
    )
    const { result } = renderHook(() => useLives({ songIds: [1, 2] }), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestedUrl).toContain('songIds=1%2C2')
  })

  it('startDate / endDate パラメータを URL クエリに含める', async () => {
    let requestedUrl = ''
    server.use(
      http.get('/api/lives', ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json(mockLives)
      })
    )
    const { result } = renderHook(
      () => useLives({ startDate: '2024-01-01', endDate: '2024-12-31' }),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestedUrl).toContain('startDate=2024-01-01')
    expect(requestedUrl).toContain('endDate=2024-12-31')
  })

  it('include_setlists パラメータを URL クエリに含める', async () => {
    let requestedUrl = ''
    server.use(
      http.get('/api/lives', ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json(mockLives)
      })
    )
    const { result } = renderHook(() => useLives({ include_setlists: true }), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestedUrl).toContain('include_setlists=true')
  })
})

describe('useLiveDetail', () => {
  it('指定 ID のライブ詳細を取得する', async () => {
    const { result } = renderHook(() => useLiveDetail(1), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe(1)
    expect(result.current.data?.tour_name).toBe(mockLives[0].tour_name)
  })

  it('id が undefined のときフェッチしない', () => {
    const { result } = renderHook(() => useLiveDetail(undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })

  it('存在しない ID の場合エラーになる', async () => {
    const { result } = renderHook(() => useLiveDetail(9999), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
