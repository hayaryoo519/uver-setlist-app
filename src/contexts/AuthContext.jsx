import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('token');
            if (storedUser && storedToken && storedUser !== "undefined" && storedToken !== "undefined") {
                // Decode and validate token expiration
                try {
                    const decoded = jwtDecode(storedToken);
                    const currentTime = Date.now() / 1000;

                    if (decoded.exp && decoded.exp < currentTime) {
                        // Token expired
                        console.log('Token expired on page load, clearing session');
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        setCurrentUser(null);
                    } else {
                        // Token is valid
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

    // Global Fetch Interceptor for 401/403 handling
    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            
            // Extract URL safely
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            
            // If the API returns 401 or 403 and the user is supposedly logged in
            if ((response.status === 401 || response.status === 403) && url.includes('/api/')) {
                const token = localStorage.getItem('token');
                if (token) {
                    console.warn(`[API] 認証エラー (${response.status}) を検知しました。再ログインが必要です。URL: ${url}`);
                    
                    // Cleanup session data
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setCurrentUser(null);
                    
                    // Alert and redirect
                    alert('セッションの有効期限が切れました。再度ログインしてください。');
                    window.location.href = '/login';
                }
            }
            
            return response;
        };

        return () => {
            window.fetch = originalFetch; // Cleanup on unmount
        };
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
        }, 5 * 60 * 1000); // Check every 5 minutes

        return () => clearInterval(interval);
    }, [currentUser]);

    const login = async (email, password) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                let errorMessage = 'ログインに失敗しました';
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const errorData = await response.json();
                    errorMessage = errorData.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
                } else {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            setCurrentUser(data.user);
            return { success: true };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, message: error.message };
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                let errorMessage = 'アカウント登録に失敗しました';
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const errorData = await response.json();
                    errorMessage = errorData.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
                } else {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // ONLY Save token if NOT requiring verification
            if (!data.requireVerification) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setCurrentUser(data.user);
            }

            return { success: true, ...data };
        } catch (error) {
            console.error("Registration error:", error);
            return { success: false, message: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
    };

    const updateUser = async (updatedData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify(updatedData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Update failed');
            }

            const data = await response.json();
            // Update localStorage
            localStorage.setItem('user', JSON.stringify(data));
            // Update state
            setCurrentUser(data);
            return { success: true };
        } catch (error) {
            console.error("Update error:", error);
            return { success: false, message: error.message };
        }
    };

    const deleteAccount = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users/me', {
                method: 'DELETE',
                headers: { 'token': token }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Deletion failed');
            }

            // Cleanup
            logout();
            return { success: true };
        } catch (error) {
            console.error("Delete error:", error);
            return { success: false, message: error.message };
        }
    };

    const value = {
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
