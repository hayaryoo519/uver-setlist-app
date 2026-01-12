import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Users, Music, Calendar, Plus, Loader, ArrowUpDown, Trash2, Search, Edit2, ShieldAlert, X, Check, ListMusic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SetlistEditor from '../components/Admin/SetlistEditor';

const AdminPage = () => {
    const { currentUser } = useAuth();

    // Tab State: 'users' | 'lives' | 'songs'
    const [activeTab, setActiveTab] = useState('lives');

    // --- USERS STATE ---
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userSortConfig, setUserSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    // --- LIVES STATE ---
    const [lives, setLives] = useState([]);
    const [isLoadingLives, setIsLoadingLives] = useState(false);
    const [showLiveModal, setShowLiveModal] = useState(false);
    const [editingLive, setEditingLive] = useState(null);
    const [liveFormData, setLiveFormData] = useState({ tour_name: '', title: '', date: '', venue: '', type: 'ONEMAN' });

    // --- SETLIST STATE ---
    const [showSetlistEditor, setShowSetlistEditor] = useState(false);
    const [selectedLiveForSetlist, setSelectedLiveForSetlist] = useState(null);

    // --- SONGS STATE ---
    const [songs, setSongs] = useState([]);
    const [isLoadingSongs, setIsLoadingSongs] = useState(false);
    const [songSearchTerm, setSongSearchTerm] = useState('');
    const [showSongModal, setShowSongModal] = useState(false);
    const [editingSong, setEditingSong] = useState(null);
    const [songFormData, setSongFormData] = useState({ title: '', album: '', release_year: '', mv_url: '', author: '' });


    // Initial Fetch
    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'lives') fetchLives();
        if (activeTab === 'songs') fetchSongs();
    }, [activeTab]);


    // --- API CALLS: LIVES ---
    const fetchLives = async () => {
        setIsLoadingLives(true);
        try {
            const res = await fetch('http://localhost:4000/api/lives');
            const data = await res.json();
            setLives(data);
        } catch (err) { console.error(err); } finally { setIsLoadingLives(false); }
    };

    const handleLiveSubmit = async (e) => {
        e.preventDefault();
        const url = editingLive ? `http://localhost:4000/api/lives/${editingLive.id}` : 'http://localhost:4000/api/lives';
        const method = editingLive ? 'PUT' : 'POST';
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify(liveFormData)
            });
            if (res.ok) {
                fetchLives(); setShowLiveModal(false);
                setEditingLive(null); setLiveFormData({ tour_name: '', title: '', date: '', venue: '', type: 'ONEMAN' });
            } else alert("Failed to save live");
        } catch (err) { console.error(err); alert("Error saving live"); }
    };

    const handleDeleteLive = async (id) => {
        if (!window.confirm("Delete this live event?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:4000/api/lives/${id}`, { method: 'DELETE', headers: { token } });
            if (res.ok) fetchLives();
        } catch (err) { console.error(err); }
    };

    const openEditLive = (live) => {
        setEditingLive(live);
        setLiveFormData({
            tour_name: live.tour_name,
            title: live.title || '',
            date: live.date.split('T')[0],
            venue: live.venue,
            type: live.type || 'ONEMAN'
        });
        setShowLiveModal(true);
    };

    const openSetlistEditor = (live) => {
        setSelectedLiveForSetlist(live);
        setShowSetlistEditor(true);
    };


    // --- API CALLS: SONGS ---
    const fetchSongs = async () => {
        setIsLoadingSongs(true);
        try {
            const res = await fetch('http://localhost:4000/api/songs');
            const data = await res.json();
            setSongs(data);
        } catch (err) { console.error(err); } finally { setIsLoadingSongs(false); }
    };

    const handleSongSubmit = async (e) => {
        e.preventDefault();
        const url = editingSong ? `http://localhost:4000/api/songs/${editingSong.id}` : 'http://localhost:4000/api/songs';
        const method = editingSong ? 'PUT' : 'POST';
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify(songFormData)
            });
            if (res.ok) {
                fetchSongs(); setShowSongModal(false);
                setEditingSong(null); setSongFormData({ title: '', album: '', release_year: '', mv_url: '', author: '' });
            } else alert("Failed to save song");
        } catch (err) { console.error(err); alert("Error saving song"); }
    };

    const handleDeleteSong = async (id) => {
        if (!window.confirm("Delete this song? (If it's in a setlist, this might fail)")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:4000/api/songs/${id}`, { method: 'DELETE', headers: { token } });
            if (res.ok) fetchSongs();
            else { const d = await res.json(); alert(d.message || "Failed"); }
        } catch (err) { console.error(err); }
    };

    const openEditSong = (song) => {
        setEditingSong(song);
        setSongFormData({
            title: song.title,
            album: song.album || '',
            release_year: song.release_year || '',
            mv_url: song.mv_url || '',
            author: song.author || ''
        });
        setShowSongModal(true);
    };


    // --- API CALLS: USERS ---
    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:4000/api/users', { headers: { token: token } });
            if (response.ok) { const data = await response.json(); setUsers(data); }
        } catch (err) { console.error(err); } finally { setIsLoadingUsers(false); }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:4000/api/users/${userId}`, { method: 'DELETE', headers: { token: token } });
            if (response.ok) fetchUsers();
            else { const msg = await response.json(); alert(msg || "Failed to delete user"); }
        } catch (err) { console.error(err); }
    };

    const handleRoleUpdate = async (userId, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (!window.confirm(`Change role to ${newRole}?`)) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:4000/api/users/${userId}/role`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', token: token },
                body: JSON.stringify({ role: newRole })
            });
            if (response.ok) fetchUsers();
        } catch (err) { console.error(err); }
    };

    // --- HELPERS ---
    const requestUserSort = (key) => {
        let direction = 'asc';
        if (userSortConfig.key === key && userSortConfig.direction === 'asc') direction = 'desc';
        setUserSortConfig({ key, direction });
    };

    const processedUsers = useMemo(() => {
        let items = [...users];
        if (userSearchTerm) {
            const lowerTerm = userSearchTerm.toLowerCase();
            items = items.filter(u => u.username.toLowerCase().includes(lowerTerm) || u.email.toLowerCase().includes(lowerTerm));
        }
        if (userSortConfig.key) {
            items.sort((a, b) => {
                if (a[userSortConfig.key] < b[userSortConfig.key]) return userSortConfig.direction === 'asc' ? -1 : 1;
                if (a[userSortConfig.key] > b[userSortConfig.key]) return userSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [users, userSearchTerm, userSortConfig]);

    const processedSongs = useMemo(() => {
        if (!songs) return [];
        let items = [...songs];
        if (songSearchTerm) {
            const lower = songSearchTerm.toLowerCase();
            items = items.filter(s => s.title.toLowerCase().includes(lower));
        }
        items.sort((a, b) => a.title.localeCompare(b.title));
        return items;
    }, [songs, songSearchTerm]);


    return (
        <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }} className="fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
                <Shield size={40} color="var(--primary-color)" />
                <h1 style={{ fontSize: '2.5rem', fontFamily: 'Oswald', margin: 0 }}>ADMIN DASHBOARD</h1>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>

                <div className={`admin-card ${activeTab === 'lives' ? 'active' : ''}`} onClick={() => setActiveTab('lives')}>
                    <div className="card-header">
                        <h2 className="card-title"><Calendar size={24} color="#94a3b8" /> Lives</h2>
                        <span className="card-badge">{lives.length}</span>
                    </div>
                </div>

                <div className={`admin-card ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => setActiveTab('songs')}>
                    <div className="card-header">
                        <h2 className="card-title"><Music size={24} color="#94a3b8" /> Songs</h2>
                        <span className="card-badge">{songs.length}</span>
                    </div>
                </div>

                <div className={`admin-card ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                    <div className="card-header">
                        <h2 className="card-title"><Users size={24} color="#94a3b8" /> Users</h2>
                        <span className="card-badge">{users.length}</span>
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="content-area">

                {/* LIVES CONTENT */}
                {activeTab === 'lives' && (
                    <div className="tab-content fade-in">
                        <div className="table-header-panel">
                            <h3>Live Events</h3>
                            <button className="btn-primary" style={{ width: 'auto' }} onClick={() => {
                                setEditingLive(null); setLiveFormData({ tour_name: '', title: '', date: '', venue: '', type: 'ONEMAN' });
                                setShowLiveModal(true);
                            }}>
                                <Plus size={18} /> Add New Live
                            </button>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead><tr><th>Date</th><th>Tour Name</th><th>Venue</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {lives.map(live => (
                                        <tr key={live.id}>
                                            <td>{new Date(live.date).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>{live.tour_name}</div>
                                                {live.title && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{live.title}</div>}
                                            </td>
                                            <td style={{ color: '#cbd5e1' }}>{live.venue}</td>
                                            <td className="actions-cell">
                                                <button onClick={() => openSetlistEditor(live)} className="action-btn" title="Edit Setlist" style={{ color: '#3b82f6', marginRight: '5px' }}>
                                                    <ListMusic size={18} />
                                                </button>
                                                <button onClick={() => openEditLive(live)} className="action-btn edit"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDeleteLive(live.id)} className="action-btn delete"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {lives.length === 0 && <tr><td colSpan="4" className="empty-cell">No lives registered yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* SONGS CONTENT */}
                {activeTab === 'songs' && (
                    <div className="tab-content fade-in">
                        <div className="table-header-panel">
                            <h3>Songs Master</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} className="search-icon" />
                                    <input
                                        type="text" placeholder="Search songs..."
                                        value={songSearchTerm} onChange={(e) => setSongSearchTerm(e.target.value)}
                                        className="search-input"
                                    />
                                </div>
                                <button className="btn-primary" style={{ width: 'auto' }} onClick={() => {
                                    setEditingSong(null); setSongFormData({ title: '', album: '', release_year: '', mv_url: '', author: '' });
                                    setShowSongModal(true);
                                }}>
                                    <Plus size={18} /> Add Song
                                </button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead><tr><th>ID</th><th>Title</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {processedSongs.map(song => (
                                        <tr key={song.id}>
                                            <td style={{ width: '80px', color: '#94a3b8' }}>#{song.id}</td>
                                            <td style={{ fontWeight: 'bold' }}>{song.title}</td>
                                            <td className="actions-cell" style={{ width: '120px' }}>
                                                <button onClick={() => openEditSong(song)} className="action-btn edit"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDeleteSong(song.id)} className="action-btn delete"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {processedSongs.length === 0 && <tr><td colSpan="3" className="empty-cell">No songs found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* USERS CONTENT */}
                {activeTab === 'users' && (
                    <div className="tab-content fade-in">
                        <div className="table-header-panel">
                            <h3>Registered Users</h3>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} className="search-icon" />
                                <input
                                    type="text" placeholder="Search users..."
                                    value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => requestUserSort('id')} className="sortable-th">ID <ArrowUpDown size={14} /></th>
                                        <th onClick={() => requestUserSort('username')} className="sortable-th">Username <ArrowUpDown size={14} /></th>
                                        <th>Email</th><th>Role</th><th>Joined</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedUsers.map(user => (
                                        <tr key={user.id}>
                                            <td>#{user.id}</td>
                                            <td style={{ fontWeight: 'bold' }}>{user.username}</td>
                                            <td style={{ color: '#cbd5e1' }}>{user.email}</td>
                                            <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                                            <td style={{ color: '#94a3b8' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td className="actions-cell">
                                                <button onClick={() => handleRoleUpdate(user.id, user.role)} className="action-btn promote"><ShieldAlert size={18} /></button>
                                                <button onClick={() => handleDeleteUser(user.id)} disabled={currentUser && user.id === currentUser.id} className={`action-btn delete ${currentUser && user.id === currentUser.id ? 'disabled' : ''}`}><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* LIVE MODAL */}
            {showLiveModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editingLive ? 'Edit Live Event' : 'Add New Live'}</h2>
                        <form onSubmit={handleLiveSubmit}>
                            <div className="form-group"><label>Tour Name</label><input type="text" required value={liveFormData.tour_name} onChange={e => setLiveFormData({ ...liveFormData, tour_name: e.target.value })} /></div>
                            <div className="form-group"><label>Title (Optional)</label><input type="text" placeholder="Specific show name e.g. Final, Birthday" value={liveFormData.title} onChange={e => setLiveFormData({ ...liveFormData, title: e.target.value })} /></div>

                            <div className="form-group">
                                <label>Live Type</label>
                                <select
                                    value={liveFormData.type}
                                    onChange={e => setLiveFormData({ ...liveFormData, type: e.target.value })}
                                    style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }}
                                >
                                    <option value="ONEMAN">One Man / Tour</option>
                                    <option value="FESTIVAL">Festival</option>
                                    <option value="EVENT">Event / Tai-ban</option>
                                </select>
                            </div>

                            <div className="form-group"><label>Date</label><input type="date" required value={liveFormData.date} onChange={e => setLiveFormData({ ...liveFormData, date: e.target.value })} /></div>
                            <div className="form-group">
                                <label>Venue</label>
                                <input
                                    type="text"
                                    required
                                    value={liveFormData.venue}
                                    onChange={e => setLiveFormData({ ...liveFormData, venue: e.target.value })}
                                    list="venue-suggestions"
                                />
                                <datalist id="venue-suggestions">
                                    {[...new Set(lives.map(l => l.venue))].sort().map(venue => (
                                        <option key={venue} value={venue} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="modal-actions"><button type="button" onClick={() => setShowLiveModal(false)} className="btn-cancel">Cancel</button><button type="submit" className="btn-primary">Save Live</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* SONG MODAL */}
            {showSongModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editingSong ? 'Edit Song' : 'Add New Song'}</h2>
                        <form onSubmit={handleSongSubmit}>
                            <div className="form-group"><label>Song Title</label><input type="text" required value={songFormData.title} onChange={e => setSongFormData({ ...songFormData, title: e.target.value })} /></div>
                            <div className="form-group"><label>Album</label><input type="text" value={songFormData.album} onChange={e => setSongFormData({ ...songFormData, album: e.target.value })} /></div>
                            <div className="form-group"><label>Release Year</label><input type="number" value={songFormData.release_year} onChange={e => setSongFormData({ ...songFormData, release_year: e.target.value })} /></div>
                            <div className="form-group"><label>Author (Lyrics/Music)</label><input type="text" value={songFormData.author} onChange={e => setSongFormData({ ...songFormData, author: e.target.value })} /></div>
                            <div className="form-group"><label>MV URL</label><input type="text" placeholder="https://youtube.com/..." value={songFormData.mv_url} onChange={e => setSongFormData({ ...songFormData, mv_url: e.target.value })} /></div>

                            <div className="modal-actions"><button type="button" onClick={() => setShowSongModal(false)} className="btn-cancel">Cancel</button><button type="submit" className="btn-primary">Save Song</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* SETLIST EDITOR MODAL */}
            {showSetlistEditor && selectedLiveForSetlist && (
                <SetlistEditor
                    liveId={selectedLiveForSetlist.id}
                    liveDate={new Date(selectedLiveForSetlist.date).toLocaleDateString()}
                    liveTitle={selectedLiveForSetlist.tour_name + (selectedLiveForSetlist.title ? ` - ${selectedLiveForSetlist.title}` : '')}
                    onClose={() => setShowSetlistEditor(false)}
                />
            )}

            <style>{`
                .admin-card { background: rgba(30, 41, 59, 0.7); padding: 25px; border-radius: 12px; border: 1px solid #334155; cursor: pointer; transition: all 0.2s; }
                .admin-card:hover { transform: translateY(-2px); border-color: #475569; }
                .admin-card.active { border-color: var(--primary-color); background: rgba(30, 41, 59, 0.9); box-shadow: 0 0 15px rgba(0,0,0,0.3); }
                .card-header { display: flex; justify-content: space-between; align-items: center; }
                .card-title { display: flex; align-items: center; gap: 10px; font-size: 1.5rem; margin: 0; }
                .card-badge { background: rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 20px; font-size: 0.8rem; }
                .content-area { margin-top: 20px; }
                .table-header-panel { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 10px; }
                .table-container { background: rgba(15, 23, 42, 0.6); border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
                .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
                .admin-table th { background: rgba(0,0,0,0.2); color: #94a3b8; padding: 15px 20px; font-weight: normal; }
                .admin-table td { padding: 15px 20px; border-bottom: 1px solid #334155; }
                .admin-table tr:hover { background: rgba(255,255,255,0.05); }
                .actions-cell { display: flex; gap: 10px; }
                .action-btn { background: none; border: none; cursor: pointer; padding: 5px; border-radius: 4px; transition: background 0.2s; }
                .action-btn:hover { background: rgba(255,255,255,0.1); }
                .action-btn.edit { color: #60a5fa; }
                .action-btn.delete { color: #ef4444; }
                .action-btn.promote { color: #fbbf24; }
                .action-btn.disabled { opacity: 0.3; cursor: not-allowed; }
                .role-badge { padding: 4px 8px; border-radius: 4px; fontSize: 0.8rem; }
                .role-badge.admin { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
                .role-badge.user { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; }
                .modal-content { background: #1e293b; padding: 30px; border-radius: 12px; width: 500px; max-width: 90%; border: 1px solid #334155; }
                .modal-content h2 { margin-top: 0; margin-bottom: 20px; font-family: 'Oswald'; }
                .form-group { margin-bottom: 20px; }
                .form-group label { display: block; margin-bottom: 8px; color: #cbd5e1; }
                .form-group input { width: 100%; padding: 10px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #fff; }
                .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px; }
                .btn-cancel { padding: 10px 20px; background: transparent; border: 1px solid #475569; color: #fff; border-radius: 6px; cursor: pointer; }
                .btn-primary { padding: 10px 20px; background: var(--primary-color); color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; alignItems: center; gap: 8px; }
                .search-input { background: rgba(0,0,0,0.3); border: 1px solid #475569; border-radius: 6px; padding: 8px 10px 8px 35px; color: #fff; width: 250px; }
                .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .sortable-th { cursor: pointer; user-select: none; }
                .empty-cell { padding: 30px; text-align: center; color: #94a3b8; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .fade-in { animation: fadeIn 0.3s ease-out; }
            `}</style>
        </div>
    );
};

export default AdminPage;
