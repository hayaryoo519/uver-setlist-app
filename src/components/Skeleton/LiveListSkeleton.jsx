import React from 'react';
import Skeleton from '../Skeleton';

const LiveListSkeleton = () => {
    return (
        <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '16px',
            borderLeft: '4px solid #334155'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: '100%' }}>
                    <Skeleton width="150px" height="14px" style={{ marginBottom: '8px' }} />
                    <Skeleton width="60%" height="24px" style={{ marginBottom: '8px' }} />
                    <Skeleton width="80px" height="14px" />
                </div>
                <Skeleton width="120px" height="36px" borderRadius="999px" style={{ marginLeft: '15px' }} />
            </div>
        </div>
    );
};

export default LiveListSkeleton;
