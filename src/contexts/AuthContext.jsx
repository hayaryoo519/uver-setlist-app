import React, { createContext, useContext, useState, useEffect } from 'react';

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
                setCurrentUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.error("Failed to restore session:", e);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
        setLoading(false);
    }, []);

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
