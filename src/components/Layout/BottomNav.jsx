import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Music, Calendar, User } from 'lucide-react';
import './BottomNav.css';

const BottomNav = () => {
    const location = useLocation();

    // トップページでは表示しない
    if (location.pathname === '/') {
        return null;
    }

    return (
        <nav className="bottom-nav">
            <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <Home size={24} />
                <span>Home</span>
            </NavLink>
            <NavLink to="/songs" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <Music size={24} />
                <span>Music</span>
            </NavLink>
            <NavLink to="/lives" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <Calendar size={24} />
                <span>Live</span>
            </NavLink>
            <NavLink to="/mypage" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <User size={24} />
                <span>Profile</span>
            </NavLink>
        </nav>
    );
};

export default BottomNav;
