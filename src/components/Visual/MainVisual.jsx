import React from 'react';
import './Visual.css';

const MainVisual = () => {
    return (
        <section className="main-visual">
            <div className="main-visual-content">
                <h1 className="main-title">
                    <span className="text-gold">UVER</span>world
                    <br />
                    <span className="text-subtitle">SETLIST ARCHIVE</span>
                </h1>
                <p className="main-description">
                    あの日の感動を、永遠に。
                </p>
            </div>

            <div className="scroll-indicator">
                <span>SCROLL</span>
                <div className="line"></div>
            </div>
            <div className="main-visual-bg">
                {/* Background effect/image can go here */}
                <div className="glow-effect"></div>
            </div>
        </section>
    );
};

export default MainVisual;
