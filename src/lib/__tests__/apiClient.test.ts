import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { apiClient, ApiError } from '../apiClient'

describe('ApiError', () => {
  it('message をプロパティに持つ', () => {
    const err = new ApiError(404, { message: 'Not found' })
    expect(err.message).toBe('Not found')
    expect(err.status).toBe(404)
    expect(err.data).toEqual({ message: 'Not found' })
  })

  it('data が null のときはデフォルトメッセージを使う', () => {
    const err = new ApiError(500, null)
    expect(err.message).toBe('HTTP Error 500')
  })

  it('instanceof Error である', () => {
    const err = new ApiError(400, { message: 'Bad request' })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
  })
})

describe('apiClient.get', () => {
  it('JSON レスポンスを返す', async () => {
    server.use(
      http.get('/api/test', () => HttpResponse.json({ ok: true }))
    )
    const data = await apiClient.get<{ ok: boolean }>('/api/test')
    expect(data).toEqual({ ok: true })
  })

  it('localStorage のトークンを token ヘッダーとして送信する', async () => {
    localStorage.setItem('token', 'test-token-123')
    let receivedToken: string | null = null

    server.use(
      http.get('/api/token-check', ({ request }) => {
        receivedToken = request.headers.get('token')
        return HttpResponse.json({ ok: true })
      })
    )

    await apiClient.get('/api/token-check')
    expect(receivedToken).toBe('test-token-123')
    localStorage.removeItem('token')
  })

  it('204 レスポンスは null を返す', async () => {
    server.use(
      http.get('/api/no-content', () => new HttpResponse(null, { status: 204 }))
    )
    const data = await apiClient.get('/api/no-content')
    expect(data).toBeNull()
  })

  it('404 エラーで ApiError をスローする', async () => {
    server.use(
      http.get('/api/not-found', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 })
      )
    )
    await expect(apiClient.get('/api/not-found')).rejects.toThrow(ApiError)
    await expect(apiClient.get('/api/not-found')).rejects.toMatchObject({
      status: 404,
      data: { message: 'Not found' },
    })
  })

  it('500 エラーで ApiError をスローする', async () => {
    server.use(
      http.get('/api/server-error', () =>
        HttpResponse.json({ message: 'Internal error' }, { status: 500 })
      )
    )
    await expect(apiClient.get('/api/server-error')).rejects.toMatchObject({ status: 500 })
  })

  it('レスポンスボディが JSON でない場合は statusText をメッセージにする', async () => {
    server.use(
      http.get('/api/bad-json', () =>
        new HttpResponse('plain text error', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        })
      )
    )
    await expect(apiClient.get('/api/bad-json')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('apiClient.post', () => {
  it('ボディを JSON として送信し、レスポンスを返す', async () => {
    let receivedBody: unknown = null

    server.use(
      http.post('/api/test-post', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ created: true }, { status: 201 })
      })
    )

    const data = await apiClient.post('/api/test-post', { name: 'test' })
    expect(receivedBody).toEqual({ name: 'test' })
    expect(data).toEqual({ created: true })
  })

  it('Content-Type: application/json を送信する', async () => {
    let contentType: string | null = null

    server.use(
      http.post('/api/content-type', ({ request }) => {
        contentType = request.headers.get('content-type')
        return HttpResponse.json({ ok: true })
      })
    )

    await apiClient.post('/api/content-type', {})
    expect(contentType).toContain('application/json')
  })
})

describe('apiClient.put', () => {
  it('PUT リクエストを送信する', async () => {
    let method: string | null = null

    server.use(
      http.put('/api/test-put', ({ request }) => {
        method = request.method
        return HttpResponse.json({ updated: true })
      })
    )

    const data = await apiClient.put('/api/test-put', { value: 1 })
    expect(method).toBe('PUT')
    expect(data).toEqual({ updated: true })
  })
})

describe('apiClient.patch', () => {
  it('PATCH リクエストを送信する', async () => {
    server.use(
      http.patch('/api/test-patch', () => HttpResponse.json({ patched: true }))
    )
    const data = await apiClient.patch('/api/test-patch', { status: 'resolved' })
    expect(data).toEqual({ patched: true })
  })
})

describe('apiClient.delete', () => {
  it('DELETE リクエストを送信して null を返す（204）', async () => {
    server.use(
      http.delete('/api/test-delete', () => new HttpResponse(null, { status: 204 }))
    )
    const data = await apiClient.delete('/api/test-delete')
    expect(data).toBeNull()
  })
})
