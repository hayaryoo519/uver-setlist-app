import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import LiveList from './pages/LiveList';
import LiveDetail from './pages/LiveDetail';
import Dashboard from './pages/Dashboard';
import MyPage from './pages/MyPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ScrollToTop from './components/ScrollToTop';

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

            {/* Main App Pages (With Layout) */}
            <Route element={<LayoutRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/lives" element={<LiveList />} />
              <Route path="/live/:id" element={<LiveDetail />} />
              <Route path="/mypage" element={<MyPage />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
