import React from 'react';

const PageHeader = ({ title, subtitle, rightElement, className = '' }) => {
    return (
        <div
            className={`page-header ${className}`}
            style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginBottom: '30px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '15px'
            }}
        >
            <div>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    fontFamily: 'Oswald, sans-serif',
                    color: '#fff',
                    lineHeight: 1.2,
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {title}
                </h1>
                {subtitle && (
                    <div style={{
                        color: '#64748b',
                        fontSize: '0.9rem',
                        marginTop: '5px',
                        fontWeight: '500',
                        fontFamily: 'sans-serif'
                    }}>
                        {subtitle}
                    </div>
                )}
            </div>
            {rightElement && (
                <div style={{ marginBottom: '5px' }}>
                    {rightElement}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
