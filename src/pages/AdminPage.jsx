import React from 'react';
import { Shield, Users, Music, Calendar, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminPage = () => {
    return (
        <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
                <Shield size={40} color="var(--primary-color)" />
                <h1 style={{ fontSize: '2.5rem', fontFamily: 'Oswald', margin: 0 }}>ADMIN DASHBOARD</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                {/* 1. Live Management Card */}
                <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', margin: 0 }}>
                            <Calendar size={24} color="#94a3b8" /> Lives
                        </h2>
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>Total: -</span>
                    </div>
                    <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Manage live events, tours, and venues.</p>
                    <button style={{
                        width: '100%', padding: '12px', background: 'var(--primary-color)', color: '#000',
                        fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px'
                    }}>
                        <Plus size={18} /> Add New Live
                    </button>
                </div>

                {/* 2. Song Management Card */}
                <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', margin: 0 }}>
                            <Music size={24} color="#94a3b8" /> Songs
                        </h2>
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>Total: -</span>
                    </div>
                    <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Master database of all UVERworld songs.</p>
                    <button style={{
                        width: '100%', padding: '12px', background: 'transparent', color: '#fff', border: '1px solid #475569',
                        fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px'
                    }}>
                        <Plus size={18} /> Add New Song
                    </button>
                </div>

                {/* 3. User Management Card */}
                <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', margin: 0 }}>
                            <Users size={24} color="#94a3b8" /> Users
                        </h2>
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>Total: -</span>
                    </div>
                    <p style={{ color: '#94a3b8', marginBottom: '20px' }}>View registered users and manage bans.</p>
                    <button style={{
                        width: '100%', padding: '12px', background: 'transparent', color: '#fff', border: '1px solid #475569',
                        fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px'
                    }}>
                        View User List
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AdminPage;
