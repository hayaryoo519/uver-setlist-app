import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createWrapper } from '../../../test/utils'
import { useForgotPassword, useResetPassword, useVerifyEmail } from '../useAuthMutations'

describe('useForgotPassword', () => {
  it('パスワードリセットメールを送信する', async () => {
    let requestBody: unknown
    server.use(
      http.post('/api/auth/forgot-password', async ({ request }) => {
        requestBody = await request.json()
        return HttpResponse.json({ message: 'ok' })
      })
    )
    const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() })
    result.current.mutate('test@example.com')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestBody).toEqual({ email: 'test@example.com' })
  })

  it('API エラー時に isError になる', async () => {
    server.use(
      http.post('/api/auth/forgot-password', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 })
      )
    )
    const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() })
    result.current.mutate('notfound@example.com')
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useResetPassword', () => {
  it('パスワードをリセットする', async () => {
    let requestBody: unknown
    server.use(
      http.post('/api/auth/reset-password', async ({ request }) => {
        requestBody = await request.json()
        return HttpResponse.json({ message: 'ok' })
      })
    )
    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() })
    result.current.mutate({ token: 'abc123', password: 'newpass' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestBody).toEqual({ token: 'abc123', password: 'newpass' })
  })

  it('無効なトークン時に isError になる', async () => {
    server.use(
      http.post('/api/auth/reset-password', () =>
        HttpResponse.json({ message: 'Invalid token' }, { status: 400 })
      )
    )
    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() })
    result.current.mutate({ token: 'invalid', password: 'newpass' })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useVerifyEmail', () => {
  it('メールアドレスを確認する', async () => {
    let requestBody: unknown
    server.use(
      http.post('/api/auth/verify-email', async ({ request }) => {
        requestBody = await request.json()
        return HttpResponse.json({ message: 'ok' })
      })
    )
    const { result } = renderHook(() => useVerifyEmail(), { wrapper: createWrapper() })
    result.current.mutate('verify-token-123')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestBody).toEqual({ token: 'verify-token-123' })
  })

  it('無効なトークン時に isError になる', async () => {
    server.use(
      http.post('/api/auth/verify-email', () =>
        HttpResponse.json({ message: 'Token expired' }, { status: 400 })
      )
    )
    const { result } = renderHook(() => useVerifyEmail(), { wrapper: createWrapper() })
    result.current.mutate('expired-token')
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
