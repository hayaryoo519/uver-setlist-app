import React from 'react';
import Navbar from './Navbar';

const MainLayout = ({ children }) => {
    return (
        <div className="main-layout">
            <Navbar />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default MainLayout;
