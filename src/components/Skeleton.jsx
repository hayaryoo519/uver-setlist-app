import React from 'react';

const Skeleton = ({ width, height, borderRadius = '4px', style }) => {
    return (
        <div
            style={{
                width: width || '100%',
                height: height || '20px',
                borderRadius: borderRadius,
                backgroundColor: '#334155',
                animation: 'pulse 1.5s infinite ease-in-out',
                ...style
            }}
        />
    );
};

export default Skeleton;
