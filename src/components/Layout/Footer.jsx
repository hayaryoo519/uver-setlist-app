import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

const Footer = () => {
    const { currentUser } = useAuth();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-links">
                    {currentUser && (
                        <Link to="/corrections/new" className="footer-link">
                            <AlertTriangle size={14} /> 不具合・データ修正依頼
                        </Link>
                    )}
                </div>
                <div className="footer-copyright">
                    &copy; {new Date().getFullYear()} UVERworld Setlist Archive. Unofficial fan project.
                </div>
            </div>

            <style>{`
                .footer {
                    background: var(--bg-color, #0f172a);
                    color: #64748b;
                    padding: 30px 0;
                    margin-top: auto; /* Push to bottom if flex layout used */
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    font-size: 0.85rem;
                }

                .footer-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }

                .footer-links {
                    display: flex;
                    gap: 20px;
                    align-items: center;
                }

                .footer-link {
                    color: #94a3b8;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: color 0.2s;
                }

                .footer-link:hover {
                    color: white;
                }

                .footer-copyright {
                    font-size: 0.8rem;
                    opacity: 0.7;
                }
            `}</style>
        </footer>
    );
};

export default Footer;
