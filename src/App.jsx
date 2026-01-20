import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import LandingPage from './pages/LandingPage';
import LiveList from './pages/LiveList';
import LiveDetail from './pages/LiveDetail';
import SongDetail from './pages/SongDetail';
import Songs from './pages/Songs';
import Dashboard from './pages/Dashboard';
import MyPage from './pages/MyPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminPage from './pages/AdminPage';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';

// Wrapper for pages that need the Main Layout (Navbar, etc.)
const LayoutRoute = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            {/* Auth Pages (Standalone) */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            {/* Admin Route */}
            <Route element={<ProtectedRoute requireAdmin={true} />}>
              <Route element={<LayoutRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>

            {/* Standard Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<LayoutRoute />}>
                <Route path="/mypage" element={<MyPage />} />
              </Route>
            </Route>

            {/* Public Routes */}
            {/* Landing Page (No Layout) */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Routes (With Layout) */}
            <Route element={<LayoutRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/songs" element={<Songs />} />
              <Route path="/lives" element={<LiveList />} />
              <Route path="/live/:id" element={<LiveDetail />} />
              <Route path="/song/:id" element={<SongDetail />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
