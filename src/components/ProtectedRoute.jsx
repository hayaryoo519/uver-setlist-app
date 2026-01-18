import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ requireAdmin = false }) => {
    const { currentUser } = useAuth();

    // Note: AuthContext handles initial loading by blocking render
    // so we don't need to check loading state here.

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && currentUser.role !== 'admin') {
        return <Navigate to="/" replace />; // Redirect non-admins to dashboard
    }

    return <Outlet />;
};

export default ProtectedRoute;
