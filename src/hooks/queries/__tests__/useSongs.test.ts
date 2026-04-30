import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createWrapper } from '../../../test/utils'
import { mockSongs } from '../../../test/mocks/data'
import { useSongs, useSongDetail, useSongStats, useSongImage } from '../useSongs'

describe('useSongs', () => {
  it('楽曲一覧を取得する', async () => {
    const { result } = renderHook(() => useSongs(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(mockSongs.length)
    expect(result.current.data![0].title).toBe('IMPACT')
  })
})

describe('useSongDetail', () => {
  it('指定 ID の楽曲を取得する', async () => {
    const { result } = renderHook(() => useSongDetail(1), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe(1)
    expect(result.current.data?.title).toBe('IMPACT')
  })

  it('id が undefined のときフェッチしない', () => {
    const { result } = renderHook(() => useSongDetail(undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useSongStats', () => {
  it('楽曲統計を取得する', async () => {
    const { result } = renderHook(() => useSongStats(1), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total_performances).toBe(3)
    expect(result.current.data?.lives).toHaveLength(2)
  })

  it('id が undefined のときフェッチしない', () => {
    const { result } = renderHook(() => useSongStats(undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })

  it('タイトル中の空白を除去して URL エンコードする', async () => {
    let requestedPath = ''
    server.use(
      http.get('/api/songs/:id/stats', ({ request }) => {
        requestedPath = new URL(request.url).pathname
        return HttpResponse.json({ total_performances: 1, lives: [] })
      })
    )
    const { result } = renderHook(() => useSongStats('ZERO  ONE'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestedPath).toBe('/api/songs/ZEROONE/stats')
  })
})

describe('useSongImage', () => {
  it('楽曲画像 URL を取得する', async () => {
    const { result } = renderHook(() => useSongImage('IMPACT'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.image_url).toBe('https://example.com/image.jpg')
  })

  it('enabled: false のときフェッチしない', () => {
    const { result } = renderHook(() => useSongImage('IMPACT', { enabled: false }), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })

  it('title が undefined のときフェッチしない', () => {
    const { result } = renderHook(() => useSongImage(undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })
})
