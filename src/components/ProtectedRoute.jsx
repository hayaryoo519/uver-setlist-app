import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
    const { currentUser } = useAuth();

    // Note: AuthContext handles initial loading by blocking render
    // so we don't need to check loading state here.

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
