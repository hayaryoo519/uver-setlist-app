import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createWrapper } from '../../../test/utils'
import { useSubmitCorrection } from '../useCorrections'

describe('useSubmitCorrection', () => {
  it('修正依頼を送信して作成されたデータを返す', async () => {
    const { result } = renderHook(() => useSubmitCorrection(), { wrapper: createWrapper() })
    result.current.mutate({
      correction_type: 'setlist',
      description: 'アンコールにSHAMROCKが抜けています',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      correction_type: 'setlist',
      description: 'アンコールにSHAMROCKが抜けています',
      status: 'pending',
    })
  })

  it('live_id を含めて送信できる', async () => {
    let requestBody: unknown
    server.use(
      http.post('/api/corrections', async ({ request }) => {
        requestBody = await request.json()
        return HttpResponse.json({ id: 10, status: 'pending', ...(requestBody as object) }, { status: 201 })
      })
    )
    const { result } = renderHook(() => useSubmitCorrection(), { wrapper: createWrapper() })
    result.current.mutate({
      live_id: 1,
      correction_type: 'venue',
      description: '会場名が間違っています',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestBody).toMatchObject({ live_id: 1, correction_type: 'venue' })
  })

  it('API エラー時に isError になる', async () => {
    server.use(
      http.post('/api/corrections', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      )
    )
    const { result } = renderHook(() => useSubmitCorrection(), { wrapper: createWrapper() })
    result.current.mutate({ correction_type: 'setlist', description: 'テスト' })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
