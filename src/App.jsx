import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import MainLayout from './components/Layout/MainLayout';
import LandingPage from './pages/LandingPage';
import LiveList from './pages/LiveList';
import LiveDetail from './pages/LiveDetail';
import SongDetail from './pages/SongDetail';
import Songs from './pages/Songs';
import Dashboard from './pages/Dashboard';
import MyPage from './pages/MyPage';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import AdminPage from './pages/AdminPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SecurityLogsPage from './pages/SecurityLogsPage';
import CorrectionForm from './pages/CorrectionForm';
import PredictionRanking from './pages/PredictionRanking';
import SetlistPredictionCreate from './pages/SetlistPredictionCreate';
import SetlistPredictionDetail from './pages/SetlistPredictionDetail';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import { useEnvironmentTitle } from './hooks/useEnvironmentTitle';

// Wrapper for pages that need the Main Layout (Navbar, etc.)
const LayoutRoute = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

function App() {
  // 環境に応じてタイトルを変更
  useEnvironmentTitle();

  return (
    <HelmetProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <Routes>
              {/* ... (略) ... */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route path="/admin/security-logs" element={<SecurityLogsPage />} />
                <Route element={<LayoutRoute />}>
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/drafts" element={<AdminPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<LayoutRoute />}>
                  <Route path="/mypage" element={<MyPage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/corrections/new" element={<CorrectionForm />} />
                  <Route path="/predictions/new" element={<SetlistPredictionCreate />} />
                </Route>
              </Route>

              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />

              <Route element={<LayoutRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/songs" element={<Songs />} />
                <Route path="/lives" element={<LiveList />} />
                <Route path="/live/:id" element={<LiveDetail />} />
                <Route path="/song/:id" element={<SongDetail />} />
                <Route path="/predictions" element={<PredictionRanking />} />
                <Route path="/predictions/:id" element={<SetlistPredictionDetail />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </HelmetProvider>
  );
}

export default App;
