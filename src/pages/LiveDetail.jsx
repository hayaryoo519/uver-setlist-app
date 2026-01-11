import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lives } from '../data/lives';
import { setlists } from '../data/setlists';
import { isAttended, toggleAttendance } from '../utils/storage';
import SEO from '../components/SEO';

function LiveDetail() {
    const { id } = useParams();
    const live = lives.find((l) => l.id === id);
    const setlist = setlists[id];
    const [attended, setAttended] = useState(false);

    useEffect(() => {
        setAttended(isAttended(id));
    }, [id]);

    const handleToggleAttendance = () => {
        toggleAttendance(id);
        setAttended(!attended);
    };

    if (!live) {
        return <div className="container">Live not found</div>;
    }

    return (
        <div className="container" style={{ paddingTop: '100px' }}>
            <SEO
                title={`${live.tourTitle} (${live.date})`}
                description={`UVERworld ${live.tourTitle} @ ${live.venue} Setlist and Live Report.`}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <Link to="/lives" style={{ color: '#94a3b8' }}>&larr; Back to Archive</Link>
                <Link to="/mypage" style={{ color: 'var(--accent-color)' }}>My Page &rarr;</Link>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ marginBottom: '10px' }}>{live.tourTitle}</h1>
                <div style={{ color: '#94a3b8', marginBottom: '16px' }}>{live.date} @ {live.venue}</div>

                <button
                    onClick={handleToggleAttendance}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: attended ? 'var(--accent-color)' : '#334155',
                        color: attended ? '#0f172a' : 'white',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        transition: 'all 0.2s'
                    }}
                >
                    {attended ? '✓ 参戦済み' : '+ 参戦記録をつける'}
                </button>
            </div>

            <div className="setlist">
                {setlist ? (
                    setlist.map((song, index) => {
                        const isEncore = song.note === 'Encore';
                        const showEncoreHeader = isEncore && (index === 0 || setlist[index - 1].note !== 'Encore');

                        return (
                            <React.Fragment key={song.order}>
                                {showEncoreHeader && (
                                    <div style={{
                                        textAlign: 'center',
                                        color: '#94a3b8',
                                        fontSize: '0.8rem',
                                        letterSpacing: '2px',
                                        margin: '20px 0 10px',
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <span style={{ padding: '0 10px', backgroundColor: 'var(--bg-color)', position: 'relative', zIndex: 1 }}>ENCORE</span>
                                        <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: '#334155' }}></div>
                                    </div>
                                )}
                                <div style={{
                                    padding: '16px 10px',
                                    borderBottom: '1px solid #1e293b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'background-color 0.2s',
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <span style={{
                                        width: '40px',
                                        color: '#64748b',
                                        fontWeight: 'bold',
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem'
                                    }}>
                                        {String(song.order).padStart(2, '0')}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{song.title}</div>
                                    </div>
                                    {song.note && song.note !== 'Encore' && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                            color: 'var(--accent-color)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            marginLeft: '10px'
                                        }}>
                                            {song.note}
                                        </span>
                                    )}
                                </div>
                            </React.Fragment>
                        );
                    })
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <p>No setlist data available for this show.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LiveDetail;
