import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, isSessionExpiredResponse, useAuth } from '../AuthContext'
import { apiClient } from '../../lib/apiClient'

describe('isSessionExpiredResponse', () => {
  it('401 はセッション切れとして扱う', async () => {
    const response = new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })

    await expect(isSessionExpiredResponse(response)).resolves.toBe(true)
  })

  it('認証エラーの 403 はセッション切れとして扱う', async () => {
    const response = Response.json(
      { message: '認証されていません：無効なトークンです' },
      { status: 403 },
    )

    await expect(isSessionExpiredResponse(response)).resolves.toBe(true)
  })

  it('業務ルールの 403 はセッション切れとして扱わない', async () => {
    const response = Response.json(
      { message: 'バックアップは本番環境でのみ実行できます' },
      { status: 403 },
    )

    await expect(isSessionExpiredResponse(response)).resolves.toBe(false)
  })
})

describe('profile and password update sessions', () => {
  const user = { id: 1, username: 'fixture-user', email: 'fake@example.invalid', role: 'user' as const }
  const storedToken = `e30.${btoa(JSON.stringify({ exp: 4102444800 }))}.fixture`
  beforeEach(() => {
    localStorage.setItem('token', storedToken)
    localStorage.setItem('user', JSON.stringify(user))
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    localStorage.clear()
  })
  it('clears the current session after a successful password change', async () => {
    vi.spyOn(apiClient, 'put').mockResolvedValue(user)
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.currentUser?.id).toBe(1))
    let response
    await act(async () => { response = await result.current.updateUser({ password: 'new-fixture-password', currentPassword: 'old-fixture-password' }) })
    expect(response).toMatchObject({ success: true, message: expect.stringContaining('再度ログイン') })
    expect(result.current.currentUser).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
  it('keeps the session after an ordinary profile edit', async () => {
    vi.spyOn(apiClient, 'put').mockResolvedValue({ ...user, username: 'updated-user' })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.currentUser?.id).toBe(1))
    await act(async () => { await result.current.updateUser({ username: 'updated-user' }) })
    expect(result.current.currentUser?.username).toBe('updated-user')
    expect(localStorage.getItem('token')).toBe(storedToken)
  })
  it('keeps the session when a password update fails', async () => {
    vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('update failed'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.currentUser?.id).toBe(1))
    await act(async () => { await result.current.updateUser({ password: 'new-fixture-password' }) })
    expect(result.current.currentUser?.id).toBe(1)
    expect(localStorage.getItem('token')).toBe(storedToken)
  })
  it('keeps the old address and session while returning the confirmation instruction', async () => {
    vi.spyOn(apiClient, 'put').mockResolvedValue({ ...user, emailChangeRequested: true, message: '確認が済むまで現在のメールアドレスを使ってください。' })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.currentUser?.id).toBe(1))
    let response
    await act(async () => { response = await result.current.updateUser({ email: 'new@example.invalid', currentPassword: 'fixture-password' }) })
    expect(response).toMatchObject({ success: true, message: expect.stringContaining('確認が済むまで') })
    expect(result.current.currentUser?.email).toBe(user.email)
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user)
    expect(localStorage.getItem('token')).toBe(storedToken)
  })
})
