import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Settings from '../Settings'
import { useAuth } from '../../contexts/AuthContext'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../components/SEO', () => ({ default: () => null }))

describe('account settings after a credential change', () => {
  const updateUser = vi.fn()
  beforeEach(() => {
    updateUser.mockReset().mockResolvedValue({ success: true, message: '新しいパスワードで再度ログインしてください。' })
    vi.mocked(useAuth).mockReturnValue({
      currentUser: { id: 1, username: 'fixture-user', email: 'fake@example.invalid', role: 'user' },
      updateUser, deleteAccount: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn(),
    })
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<MemoryRouter initialEntries={['/settings']}><Routes>
      <Route path="/settings" element={<Settings />} />
      <Route path="/login" element={<div>fixture login screen</div>} />
    </Routes></MemoryRouter>)
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })
  it('shows the re-login instruction and navigates to login after changing the password', async () => {
    fireEvent.change(screen.getByPlaceholderText('現在のパスワード（メール・パスワード変更時）'), { target: { value: 'fixture-old-password' } })
    fireEvent.change(screen.getByPlaceholderText('新しいパスワード'), { target: { value: 'fixture-new-password' } })
    fireEvent.change(screen.getByPlaceholderText('もう一度入力してください'), { target: { value: 'fixture-new-password' } })
    fireEvent.click(screen.getByRole('button', { name: '変更を保存' }))
    await screen.findByText('fixture login screen')
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ currentPassword: 'fixture-old-password', password: 'fixture-new-password' }))
    expect(window.alert).toHaveBeenCalledWith('新しいパスワードで再度ログインしてください。')
  })
  it('keeps ordinary profile changes on the settings screen', async () => {
    fireEvent.change(screen.getByPlaceholderText('ユーザー名'), { target: { value: 'updated-fixture-user' } })
    fireEvent.click(screen.getByRole('button', { name: '変更を保存' }))
    await waitFor(() => expect(screen.getByText('設定を更新しました')).toBeTruthy())
    expect(screen.queryByText('fixture login screen')).toBeNull()
    expect(window.alert).not.toHaveBeenCalled()
  })
  it('requires the current password for an email-only change', async () => {
    fireEvent.change(screen.getByPlaceholderText('メールアドレス'), { target: { value: 'new@example.invalid' } })
    fireEvent.click(screen.getByRole('button', { name: '変更を保存' }))
    expect(screen.getByText('メールアドレスを変更するには現在のパスワードを入力してください')).toBeTruthy()
    expect(updateUser).not.toHaveBeenCalled()
  })
  it('keeps the current address visible until confirmation and displays the pending instruction', async () => {
    updateUser.mockResolvedValue({ success: true, message: '確認が済むまで現在のメールアドレスを使ってください。' })
    fireEvent.change(screen.getByPlaceholderText('メールアドレス'), { target: { value: 'new@example.invalid' } })
    fireEvent.change(screen.getByPlaceholderText('現在のパスワード（メール・パスワード変更時）'), { target: { value: 'fixture-old-password' } })
    fireEvent.click(screen.getByRole('button', { name: '変更を保存' }))
    await screen.findByText('確認が済むまで現在のメールアドレスを使ってください。')
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.invalid', currentPassword: 'fixture-old-password' }))
    expect((screen.getByPlaceholderText('メールアドレス') as HTMLInputElement).value).toBe('fake@example.invalid')
    expect(screen.queryByText('fixture login screen')).toBeNull()
  })
})
