import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { apiClient } from '../lib/apiClient';
import type { AuthUser } from '../types/api';

type AuthResult = { success: boolean; message?: string }

interface AuthContextType {
    currentUser: AuthUser | null;
    login: (email: string, password: string) => Promise<AuthResult>;
    register: (username: string, email: string, password: string, is_public?: boolean) => Promise<AuthResult & Record<string, unknown>>;
    logout: () => void;
    updateUser: (updatedData: Record<string, unknown>) => Promise<AuthResult>;
    deleteAccount: () => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('token');
            if (storedUser && storedToken && storedUser !== "undefined" && storedToken !== "undefined") {
                try {
                    const decoded = jwtDecode(storedToken);
                    const currentTime = Date.now() / 1000;

                    if (decoded.exp && decoded.exp < currentTime) {
                        console.log('Token expired on page load, clearing session');
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        setCurrentUser(null);
                    } else {
                        setCurrentUser(JSON.parse(storedUser));
                    }
                } catch (decodeError) {
                    console.error("Failed to decode token:", decodeError);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    setCurrentUser(null);
                }
            }
        } catch (e) {
            console.error("Failed to restore session:", e);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
        setLoading(false);
    }, []);

    // 認証エラーのグローバルインターセプター
    // 保護されたAPIへの401/403でセッションを破棄する
    // ※ /api/auth/ は除外（ログイン失敗の401でセッション破棄しないため）
    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args: Parameters<typeof fetch>) => {
            const response = await originalFetch(...args);
            const url = typeof args[0] === 'string' ? args[0] : ((args[0] as Request)?.url ?? '');
            const isAuthEndpoint = url.includes('/api/auth/');

            if (!isAuthEndpoint && (response.status === 401 || response.status === 403) && url.includes('/api/')) {
                const token = localStorage.getItem('token');
                if (token) {
                    console.warn(`[API] 認証エラー (${response.status}) URL: ${url}`);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setCurrentUser(null);
                    alert('セッションの有効期限が切れました。再度ログインしてください。');
                    window.location.href = '/login';
                }
            }

            return response;
        };

        return () => { window.fetch = originalFetch; };
    }, []);

    // Periodic token validation (every 5 minutes)
    useEffect(() => {
        if (!currentUser) return;

        const interval = setInterval(() => {
            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
                console.log('Token missing during session, logging out');
                logout();
                return;
            }

            try {
                const decoded = jwtDecode(storedToken);
                const currentTime = Date.now() / 1000;

                if (decoded.exp && decoded.exp < currentTime) {
                    console.log('Token expired during session, logging out');
                    logout();
                }
            } catch (e) {
                console.error('Token validation failed during session:', e);
                logout();
            }
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [currentUser]);

    const login = async (email: string, password: string): Promise<AuthResult> => {
        try {
            const data = await apiClient.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setCurrentUser(data.user);
            return { success: true };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, message: (error as Error).message };
        }
    };

    const register = async (username: string, email: string, password: string, is_public?: boolean) => {
        try {
            const data = await apiClient.post<{ token?: string; user?: AuthUser; requireVerification?: boolean } & Record<string, unknown>>(
                '/api/auth/register', { username, email, password, is_public }
            );
            if (!data.requireVerification) {
                localStorage.setItem('token', data.token as string);
                localStorage.setItem('user', JSON.stringify(data.user));
                setCurrentUser(data.user as AuthUser);
            }
            return { success: true, ...data };
        } catch (error) {
            console.error("Registration error:", error);
            return { success: false, message: (error as Error).message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
    };

    const updateUser = async (updatedData: Record<string, unknown>): Promise<AuthResult> => {
        try {
            const data = await apiClient.put<AuthUser>('/api/users/me', updatedData);
            localStorage.setItem('user', JSON.stringify(data));
            setCurrentUser(data);
            return { success: true };
        } catch (error) {
            console.error("Update error:", error);
            return { success: false, message: (error as Error).message };
        }
    };

    const deleteAccount = async (): Promise<AuthResult> => {
        try {
            await apiClient.delete('/api/users/me');
            logout();
            return { success: true };
        } catch (error) {
            console.error("Delete error:", error);
            return { success: false, message: (error as Error).message };
        }
    };

    const value: AuthContextType = {
        currentUser,
        login,
        register,
        logout,
        updateUser,
        deleteAccount
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
