import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createWrapper } from '../../../test/utils'
import { mockPredictions, mockLives } from '../../../test/mocks/data'
import {
  usePredictions,
  usePredictableLives,
  useLikePrediction,
  useCreatePrediction,
} from '../usePredictions'

describe('usePredictableLives', () => {
  it('予想対象のライブ一覧を取得する', async () => {
    const { result } = renderHook(() => usePredictableLives(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(mockLives.length)
  })
})

describe('usePredictions', () => {
  it('予想一覧を取得する', async () => {
    const { result } = renderHook(() => usePredictions(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(mockPredictions.length)
  })

  it('liveId パラメータを live_id クエリに変換する', async () => {
    let requestedUrl = ''
    server.use(
      http.get('/api/predictions', ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json([])
      })
    )
    const { result } = renderHook(() => usePredictions({ liveId: 1 }), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestedUrl).toContain('live_id=1')
  })

  it('mine: true のとき mine クエリを追加する', async () => {
    let requestedUrl = ''
    server.use(
      http.get('/api/predictions', ({ request }) => {
        requestedUrl = request.url
        return HttpResponse.json([])
      })
    )
    const { result } = renderHook(() => usePredictions({ mine: true }), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestedUrl).toContain('mine=true')
  })

  it('enabled: false のときフェッチしない', () => {
    const { result } = renderHook(() => usePredictions({ enabled: false }), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useLikePrediction', () => {
  it('いいね API を呼び出す', async () => {
    let likedId: string | undefined
    server.use(
      http.post('/api/predictions/:id/like', ({ params }) => {
        likedId = params.id as string
        return HttpResponse.json({ message: 'ok' })
      })
    )

    const { result } = renderHook(() => useLikePrediction(), { wrapper: createWrapper() })
    result.current.mutate(42)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(likedId).toBe('42')
  })
})

describe('useCreatePrediction', () => {
  it('予想を作成して成功する', async () => {
    const { result } = renderHook(() => useCreatePrediction(), { wrapper: createWrapper() })
    result.current.mutate({ live_id: 1, content: 'テスト予想' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ live_id: 1, content: 'テスト予想' })
  })

  it('API エラー時に isError になる', async () => {
    server.use(
      http.post('/api/predictions', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      )
    )
    const { result } = renderHook(() => useCreatePrediction(), { wrapper: createWrapper() })
    result.current.mutate({ live_id: 1, content: 'テスト' })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
