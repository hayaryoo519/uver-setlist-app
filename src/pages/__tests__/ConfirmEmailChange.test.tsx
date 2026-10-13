import React, { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ConfirmEmailChange from '../ConfirmEmailChange'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient, ApiError } from '../../lib/apiClient'
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../components/Auth/AuthLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
describe('confirmed email change recovery', () => {
  const logout = vi.fn()
  beforeEach(() => { logout.mockReset(); vi.mocked(useAuth).mockReturnValue({ logout } as unknown as ReturnType<typeof useAuth>) })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })
  it('confirms once in StrictMode and logs out before offering the new-address login', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ message: '新しいメールアドレスでログインしてください。' })
    render(<StrictMode><MemoryRouter initialEntries={['/confirm-email-change?token=fixture']}><ConfirmEmailChange /></MemoryRouter></StrictMode>)
    await screen.findByRole('status'); expect(post.mock.calls.length).toBe(1); expect(logout.mock.calls.length).toBe(1)
    expect(screen.getByRole('link', { name: '新しいメールアドレスでログイン' }).getAttribute('href')).toBe('/login')
  })
  it('keeps the current session on a failed confirmation and offers settings recovery', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(400, { message: '無効または期限切れのリンクです' }))
    render(<MemoryRouter initialEntries={['/confirm-email-change?token=expired']}><ConfirmEmailChange /></MemoryRouter>)
    await screen.findByRole('alert'); expect(logout).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: '設定画面から再度依頼' }).getAttribute('href')).toBe('/settings')
  })
  it('rejects a missing token without calling the server', async () => {
    const post = vi.spyOn(apiClient, 'post')
    render(<MemoryRouter><ConfirmEmailChange /></MemoryRouter>)
    await screen.findByRole('alert'); expect(post).not.toHaveBeenCalled(); expect(logout).not.toHaveBeenCalled()
  })
})
