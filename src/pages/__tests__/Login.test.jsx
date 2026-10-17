import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { BrowserRouter, MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Login from '../Login';
import { AuthProvider } from '../../contexts/AuthContext';

const mocks = vi.hoisted(() => ({ login: vi.fn() }));
beforeEach(() => { mocks.login.mockReset(); mocks.login.mockResolvedValue({ success: true }); });
const Destination = () => { const location = useLocation(); return <div data-testid="destination">{location.pathname + location.search + location.hash}</div>; };

// AuthContext のモック
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        login: mocks.login,
    }),
    AuthProvider: ({ children }) => <div>{children}</div>,
}));

// ToastContext のモック
vi.mock('../../contexts/ToastContext', () => ({
    useToast: () => ({
        showToast: vi.fn(),
    }),
    ToastProvider: ({ children }) => <div>{children}</div>,
}));

// AuthLayout のモック (依存関係を減らすため)
vi.mock('../../components/Auth/AuthLayout', () => ({
    default: ({ children, title }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));


describe('Login Page', () => {
    it.each([
        [{ pathname: '/login', state: { from: { pathname: '/admin', search: '?tab=lives&metadata=42', hash: '#review' } } }, '/admin?tab=lives&metadata=42#review'],
        ['/login?returnTo=%2Fadmin%3Ftab%3Dlives%26review%3Dunconfirmed', '/admin?tab=lives&review=unconfirmed'],
        ['/login?returnTo=https%3A%2F%2Foutside.example.invalid%2Fadmin', '/mypage'],
    ])('ログイン成功後は安全な復帰先へ進む %j', async (entry, expected) => {
        render(<MemoryRouter initialEntries={[entry]}><Routes>
            <Route path="/login" element={<Login />} /><Route path="*" element={<Destination />} />
        </Routes></MemoryRouter>);
        fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'fixture@example.invalid' } });
        fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'fixture-only' } });
        fireEvent.submit(screen.getByRole('button', { name: /ログイン/i }).closest('form'));
        expect(await screen.findByTestId('destination')).toHaveTextContent(expected);
    });
    it('メールアドレスとパスワードの入力フィールドが表示されること', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
        expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ログイン/i })).toBeInTheDocument();
    });

    it('タイトルが正しく表示されること', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        // タイトル（h1）としての「ログイン」を確認
        expect(screen.getByRole('heading', { name: 'ログイン', level: 1 })).toBeInTheDocument();
    });
});
