import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock check for existing session
        const storedUser = localStorage.getItem('uver_user_session');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const signup = async (email, password) => {
        // Mock Signup
        return new Promise((resolve) => {
            setTimeout(() => {
                const user = { email, id: Date.now().toString() };
                localStorage.setItem('uver_user_session', JSON.stringify(user));
                setCurrentUser(user);
                resolve(user);
            }, 800);
        });
    };

    const login = async (email, password) => {
        // Mock Login
        return new Promise((resolve) => {
            setTimeout(() => {
                const user = { email, id: '12345' };
                localStorage.setItem('uver_user_session', JSON.stringify(user));
                setCurrentUser(user);
                resolve(user);
            }, 800);
        });
    };

    const logout = () => {
        localStorage.removeItem('uver_user_session');
        setCurrentUser(null);
    };

    const value = {
        currentUser,
        signup,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
