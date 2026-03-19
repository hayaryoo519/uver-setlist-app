import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthProvider } from '../../contexts/AuthContext';

// AuthContext のモック
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        login: vi.fn(),
    }),
    AuthProvider: ({ children }) => <div>{children}</div>,
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
