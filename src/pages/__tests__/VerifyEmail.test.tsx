import React, { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VerifyEmail from '../VerifyEmail'
import { apiClient, ApiError } from '../../lib/apiClient'
import { useResendVerification } from '../../hooks/queries/useAuthMutations'

vi.mock('../../hooks/queries/useAuthMutations', () => ({ useResendVerification: vi.fn() }))
vi.mock('../../components/Auth/AuthLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

describe('verification recovery and single-use requests', () => {
  const mutate = vi.fn()
  beforeEach(() => {
    mutate.mockReset()
    vi.mocked(useResendVerification).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useResendVerification>)
    localStorage.clear()
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })
  it('offers resend without sending a verification request when no token is provided', async () => {
    const post = vi.spyOn(apiClient, 'post')
    render(<MemoryRouter initialEntries={['/verify-email']}><VerifyEmail /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('登録したメールアドレス'), { target: { value: 'fake@example.invalid' } })
    mutate.mockImplementation((email, options) => options.onSuccess({ message: '未認証のアカウントがある場合、認証メールが届きます。' }))
    fireEvent.click(screen.getByRole('button', { name: '認証メールの再送を依頼' }))
    expect(mutate.mock.calls[0][0]).toBe('fake@example.invalid')
    expect(screen.getByRole('status').textContent).toContain('アカウントがある場合')
    expect(post).not.toHaveBeenCalled()
  })
  it('provides a recovery form after an expired token and does not save credentials', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(400, { message: '無効なトークンです' }))
    render(<MemoryRouter initialEntries={['/verify-email?token=expired-fixture']}><VerifyEmail /></MemoryRouter>)
    await screen.findByText('認証失敗')
    expect(screen.getByRole('button', { name: '認証メールの再送を依頼' })).toBeTruthy()
    expect(localStorage.getItem('token')).toBeNull()
  })
  it('submits a single verification request during StrictMode effect replay', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ token: 'fixture-session', user: { id: 1 } })
    render(<StrictMode><MemoryRouter initialEntries={['/verify-email?token=valid-fixture']}><VerifyEmail /></MemoryRouter></StrictMode>)
    await screen.findByText('認証完了！')
    expect(post.mock.calls.length).toBe(1)
    expect(post).toHaveBeenCalledWith('/api/auth/verify-email', { token: 'valid-fixture' })
    expect(localStorage.getItem('token')).toBe('fixture-session')
  })
  it('shows a rate limit failure and disables submission while a request is pending', async () => {
    mutate.mockImplementation((email, options) => options.onError(new ApiError(429, { message: '1時間後にお試しください。' })))
    const rendered = render(<MemoryRouter><VerifyEmail /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('登録したメールアドレス'), { target: { value: 'fake@example.invalid' } })
    fireEvent.click(screen.getByRole('button', { name: '認証メールの再送を依頼' }))
    expect(screen.getByRole('alert').textContent).toContain('1時間後')
    vi.mocked(useResendVerification).mockReturnValue({ mutate, isPending: true } as unknown as ReturnType<typeof useResendVerification>)
    rendered.rerender(<MemoryRouter><VerifyEmail /></MemoryRouter>)
    await waitFor(() => expect((screen.getByRole('button', { name: '受付中...' }) as HTMLButtonElement).disabled).toBe(true))
  })
})
