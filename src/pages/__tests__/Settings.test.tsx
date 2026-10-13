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
    fireEvent.change(screen.getByPlaceholderText('現在のパスワード（変更する場合のみ）'), { target: { value: 'fixture-old-password' } })
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
})
