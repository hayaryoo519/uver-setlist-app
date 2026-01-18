import React from 'react';

const VenueRanking = ({ venues }) => {
    if (!venues || venues.length === 0) return <div className="no-data">No venue data available.</div>;

    return (
        <div style={{ height: '100%', overflowY: 'auto', paddingRight: '5px' }}>
            {venues.map((venue, index) => (
                <div key={venue.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    padding: '10px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    transition: 'background 0.2s'
                }}>
                    <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        backgroundColor: index < 3 ? 'var(--primary-color)' : '#333',
                        color: index < 3 ? '#000' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        marginRight: '15px',
                        flexShrink: 0
                    }}>
                        {index + 1}
                    </div>
                    <div style={{ flexGrow: 1, fontWeight: '500' }}>
                        {venue.name}
                    </div>
                    <div style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>
                        {venue.count}回
                    </div>
                </div>
            ))}
        </div>
    );
};

export default VenueRanking;
