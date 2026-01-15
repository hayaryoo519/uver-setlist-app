import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Users, Music, Calendar, Plus, Loader, ArrowUpDown, Trash2, Search, Edit2, ShieldAlert, X, Check, ListMusic, Upload, Globe, ExternalLink, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SetlistEditor from '../components/Admin/SetlistEditor';

const AdminPage = () => {
    const { currentUser } = useAuth();

    // Tab State: 'users' | 'lives' | 'songs' | 'import' | 'collect'
    const [activeTab, setActiveTab] = useState('lives');

    // --- IMPORT STATE ---
    const [importFile, setImportFile] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [isImporting, setIsImporting] = useState(false);

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

    // --- COLLECT (SETLIST.FM) STATE ---
    const [sfmResults, setSfmResults] = useState([]);
    const [isSearchingSFM, setIsSearchingSFM] = useState(false);
    const [sfmSearchYear, setSfmSearchYear] = useState(new Date().getFullYear());
    const [sfmPreviewData, setSfmPreviewData] = useState(null);
    const [isImportingSFM, setIsImportingSFM] = useState(false);


    // Initial Fetch
    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'lives') fetchLives();
        if (activeTab === 'songs') fetchSongs();
        if (activeTab === 'import' || activeTab === 'collect') setImportResult(null);
    }, [activeTab]);

    // --- API CALLS: IMPORT ---
    const handleCSVImport = async () => {
        if (!importFile) {
            alert('Please select a CSV file');
            return;
        }

        setIsImporting(true);
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append('file', importFile);

            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:4000/api/import/csv', {
                method: 'POST',
                headers: { token },
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                setImportResult({ success: true, ...data });
                setImportFile(null);
                // Refresh lives list
                if (activeTab === 'import') fetchLives();
            } else {
                setImportResult({ success: false, message: data.message || 'Import failed' });
            }
        } catch (err) {
            console.error(err);
            setImportResult({ success: false, message: 'Error: ' + err.message });
        } finally {
            setIsImporting(false);
        }
    };

    // --- API CALLS: COLLECT (SETLIST.FM) ---
    const handleSetlistFMSearch = async () => {
        setIsSearchingSFM(true);
        setSfmResults([]);
        try {
            const token = localStorage.getItem('token');
            let allResults = [];
            let page = 1;
            let totalPages = 1;

            do {
                // Respect API Rate Limits: Add 1s delay between requests
                if (page > 1) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                const res = await fetch(`http://localhost:4000/api/external/setlistfm/search?year=${sfmSearchYear}&page=${page}`, {
                    headers: { token }
                });
                const data = await res.json();

                if (res.ok && data.setlist) {
                    allResults = [...allResults, ...data.setlist];
                    const itemsPerPage = data.itemsPerPage || 20;
                    totalPages = Math.ceil(data.total / itemsPerPage);
                    page++;
                } else if (page === 1) {
                    // Only alert on first page failure
                    alert(data.message || 'No results found or error occurred');
                    break;
                } else {
                    // Log error but keep what we have
                    console.warn(`Stopped fetching at page ${page} due to error:`, data);
                    break;
                }
            } while (page <= totalPages);

            // Check for duplicates against existing lives in DB
            // Wrap in try-catch so duplicate detection failure doesn't break search
            let resultsWithDuplicateInfo = allResults;
            try {
                const livesRes = await fetch('http://localhost:4000/api/lives');
                if (livesRes.ok) {
                    const existingLives = await livesRes.json();

                    // Create a Set of normalized keys (YYYY-MM-DD_venue)
                    const existingKeys = new Set();
                    for (const live of existingLives) {
                        const dateStr = new Date(live.date).toISOString().split('T')[0]; // YYYY-MM-DD
                        const key = `${dateStr}_${live.venue.toLowerCase()}`;
                        existingKeys.add(key);
                    }

                    // Mark duplicates in results
                    resultsWithDuplicateInfo = allResults.map(result => {
                        // Convert DD-MM-YYYY to YYYY-MM-DD for comparison
                        const parts = result.eventDate.split('-');
                        const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
                        const key = `${dateStr}_${result.venue.name.toLowerCase()}`;

                        return {
                            ...result,
                            alreadyImported: existingKeys.has(key)
                        };
                    });
                }
            } catch (dupErr) {
                console.warn('Duplicate check failed, continuing without:', dupErr);
            }

            setSfmResults(resultsWithDuplicateInfo);

        } catch (err) {
            console.error(err);
            alert('Failed to fetch from setlist.fm');
        } finally {
            setIsSearchingSFM(false);
        }
    };

    const handleImportFromSetlistFM = async (sfmSetlist) => {
        setIsImportingSFM(true);
        try {
            const token = localStorage.getItem('token');

            // Format data for our internal API
            // Note: Our import API currently takes CSV. We should probably add a JSON import endpoint or 
            // format it as single record inserts. For simplicity, let's use the standard POST /lives and then /setlist.

            // 1. Create/Update Live
            const liveData = {
                tour_name: sfmSetlist.tour?.name || 'Unknown Tour',
                title: sfmSetlist.eventDate, // Temporary title
                date: sfmSetlist.eventDate.split('-').reverse().join('-'), // DD-MM-YYYY to YYYY-MM-DD
                venue: sfmSetlist.venue.name,
                type: 'ONEMAN' // Default
            };

            const liveRes = await fetch('http://localhost:4000/api/lives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify(liveData)
            });
            const newLive = await liveRes.json();

            if (!liveRes.ok) throw new Error('Failed to create live event');

            // 2. Add songs to setlist
            const songs = [];
            if (sfmSetlist.sets && sfmSetlist.sets.set) {
                const flatSongs = sfmSetlist.sets.set.flatMap(s => s.song);
                for (const sfmSong of flatSongs) {
                    // Try to finding/creating song is handled by our upcoming logic or we just push titles?
                    // Actually, the current POST /api/lives/setlist expects IDs. 
                    // So we need to ensure songs exist first.

                    const songRes = await fetch('http://localhost:4000/api/songs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', token },
                        body: JSON.stringify({ title: sfmSong.name })
                    });
                    const sData = await songRes.json();
                    if (songRes.ok) songs.push(sData.id);
                }
            }

            if (songs.length > 0) {
                await fetch(`http://localhost:4000/api/lives/${newLive.id}/setlist`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', token },
                    body: JSON.stringify({ songs })
                });
            }

            alert('Import successful!');
            fetchLives();
        } catch (err) {
            console.error(err);
            alert('Error during import: ' + err.message);
        } finally {
            setIsImportingSFM(false);
        }
    };



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


    // --- BULK IMPORT STATE ---
    const [selectedSfmSetlists, setSelectedSfmSetlists] = useState([]);

    // Toggle single selection
    const toggleSfmSelection = (setlistId) => {
        setSelectedSfmSetlists(prev =>
            prev.includes(setlistId) ? prev.filter(id => id !== setlistId) : [...prev, setlistId]
        );
    };

    // Toggle select all
    const toggleSelectAllSfm = () => {
        if (selectedSfmSetlists.length === sfmResults.length) {
            setSelectedSfmSetlists([]);
        } else {
            setSelectedSfmSetlists(sfmResults.map(r => r.id));
        }
    };

    // --- BULK IMPORT HANDLER ---
    const handleBulkImport = async () => {
        if (!window.confirm(`Are you sure you want to import ${selectedSfmSetlists.length} setlists?`)) return;

        setIsImportingSFM(true);
        let successCount = 0;
        let failCount = 0;

        try {
            // Filter the full results to get the selected objects
            const selectedObjects = sfmResults.filter(r => selectedSfmSetlists.includes(r.id));

            for (const setlist of selectedObjects) {
                try {
                    // Reuse the existing single import logic, but we need to await it carefully
                    // Note: refactoring handleImportFromSetlistFM to return success status would be cleaner,
                    // but for now we'll wrap the logic here or call it and catch errors.
                    // Since handleImportFromSetlistFM uses setIsImportingSFM internally, we should probably refactor it
                    // or just copy the core logic. Copying logic to avoid state conflicts during loop.

                    const token = localStorage.getItem('token');

                    // 1. Create/Update Live
                    const liveData = {
                        tour_name: setlist.tour?.name || 'Unknown Tour',
                        title: setlist.eventDate,
                        date: setlist.eventDate.split('-').reverse().join('-'),
                        venue: setlist.venue.name,
                        type: 'ONEMAN'
                    };

                    const liveRes = await fetch('http://localhost:4000/api/lives', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', token },
                        body: JSON.stringify(liveData)
                    });
                    const newLive = await liveRes.json();

                    if (liveRes.ok) {
                        // 2. Add songs
                        const songs = [];
                        if (setlist.sets && setlist.sets.set) {
                            const flatSongs = setlist.sets.set.flatMap(s => s.song);
                            for (const sfmSong of flatSongs) {
                                const songRes = await fetch('http://localhost:4000/api/songs', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', token },
                                    body: JSON.stringify({ title: sfmSong.name })
                                });
                                const sData = await songRes.json();
                                if (songRes.ok) songs.push(sData.id);
                            }
                        }

                        if (songs.length > 0) {
                            await fetch(`http://localhost:4000/api/lives/${newLive.id}/setlist`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', token },
                                body: JSON.stringify({ songs })
                            });
                        }
                        successCount++;
                    } else {
                        failCount++;
                    }

                } catch (e) {
                    console.error("Bulk Import Error for " + setlist.eventDate, e);
                    failCount++;
                }
            }

            alert(`Bulk Import Complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
            fetchLives();
            setSelectedSfmSetlists([]);

        } catch (err) {
            console.error(err);
            alert('Error during bulk import');
        } finally {
            setIsImportingSFM(false);
        }
    };


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

                <div className={`admin-card ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>
                    <div className="card-header">
                        <h2 className="card-title"><Upload size={24} color="#94a3b8" /> Import</h2>
                        <span className="card-badge">CSV</span>
                    </div>
                </div>

                <div className={`admin-card ${activeTab === 'collect' ? 'active' : ''}`} onClick={() => setActiveTab('collect')}>
                    <div className="card-header">
                        <h2 className="card-title"><Globe size={24} color="#94a3b8" /> Collect</h2>
                        <span className="card-badge">API</span>
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
                                            <td style={{ width: '120px' }}>{new Date(live.date).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>{live.tour_name}</div>
                                                {live.title && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{live.title}</div>}
                                            </td>
                                            <td style={{ color: '#cbd5e1' }}>{live.venue}</td>
                                            <td style={{ width: '150px' }}>
                                                <div className="actions-wrapper">
                                                    <button onClick={() => openSetlistEditor(live)} className="action-btn" title="Edit Setlist" style={{ color: '#3b82f6' }}>
                                                        <ListMusic size={18} />
                                                    </button>
                                                    <button onClick={() => openEditLive(live)} className="action-btn edit" title="Edit Live"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDeleteLive(live.id)} className="action-btn delete" title="Delete"><Trash2 size={18} /></button>
                                                </div>
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
                                            <td style={{ width: '120px' }}>
                                                <div className="actions-wrapper">
                                                    <button onClick={() => openEditSong(song)} className="action-btn edit" title="Edit"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDeleteSong(song.id)} className="action-btn delete" title="Delete"><Trash2 size={18} /></button>
                                                </div>
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
                                            <td style={{ width: '60px' }}>#{user.id}</td>
                                            <td style={{ fontWeight: 'bold' }}>{user.username}</td>
                                            <td style={{ color: '#cbd5e1' }}>{user.email}</td>
                                            <td style={{ width: '100px' }}><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                                            <td style={{ color: '#94a3b8', width: '120px' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td style={{ width: '120px' }}>
                                                <div className="actions-wrapper">
                                                    <button onClick={() => handleRoleUpdate(user.id, user.role)} className="action-btn promote" title="Update Role"><ShieldAlert size={18} /></button>
                                                    <button onClick={() => handleDeleteUser(user.id)} disabled={currentUser && user.id === currentUser.id} className={`action-btn delete ${currentUser && user.id === currentUser.id ? 'disabled' : ''}`} title="Delete"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* IMPORT CONTENT */}
                {activeTab === 'import' && (
                    <div className="tab-content fade-in">
                        <h3 style={{ marginBottom: '20px' }}>CSV Import</h3>

                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '20px' }}>
                            <h4 style={{ marginBottom: '15px', color: '#cbd5e1' }}>CSVフォーマット</h4>
                            <pre style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem', color: '#94a3b8' }}>
                                {`live_date,venue,prefecture,tour,tags,order_no,song
2025-11-15,大阪城ホール,大阪府,BOOM GOES THE WORLD,,1,PHOENIX AX
2025-11-15,大阪城ホール,大阪府,BOOM GOES THE WORLD,Encore,2,CORE PRIDE`}
                            </pre>
                            <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#94a3b8' }}>
                                <p>• 同じ日付・会場の行は同一ライブとして扱われます</p>
                                <p>• 日付が未来の場合、自動的に <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>status=SCHEDULED</code> が設定されます</p>
                                <p>• 会場名から自動的にタイプ（ARENA/HALL/LIVEHOUSE）が判定されます</p>
                                <p>• tagsに"Encore"を指定すると、アンコール曲として登録されます</p>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '30px', borderRadius: '12px', border: '1px solid #334155' }}>
                            <h4 style={{ marginBottom: '15px', color: '#cbd5e1' }}>ファイルアップロード</h4>

                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setImportFile(e.target.files[0])}
                                style={{
                                    display: 'block',
                                    marginBottom: '15px',
                                    padding: '10px',
                                    background: '#0f172a',
                                    border: '1px solid #475569',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    width: '100%'
                                }}
                            />

                            {importFile && (
                                <div style={{ marginBottom: '15px', color: '#94a3b8', fontSize: '0.9rem' }}>
                                    選択ファイル: <strong style={{ color: '#fff' }}>{importFile.name}</strong>
                                </div>
                            )}

                            <button
                                onClick={handleCSVImport}
                                disabled={!importFile || isImporting}
                                className="btn-primary"
                                style={{ opacity: (!importFile || isImporting) ? 0.5 : 1, cursor: (!importFile || isImporting) ? 'not-allowed' : 'pointer' }}
                            >
                                {isImporting ? <><Loader size={18} className="animate-spin" /> インポート中...</> : <><Upload size={18} /> CSVをインポート</>}
                            </button>

                            {importResult && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    background: importResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${importResult.success ? '#22c55e' : '#ef4444'}`
                                }}>
                                    <h5 style={{ color: importResult.success ? '#22c55e' : '#ef4444', marginBottom: '10px' }}>
                                        {importResult.success ? '✓ インポート成功' : '✗ インポート失敗'}
                                    </h5>
                                    {importResult.success && importResult.stats && (
                                        <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                                            <p>• 新規ライブ: {importResult.stats.livesCreated}件</p>
                                            <p>• 更新ライブ: {importResult.stats.livesUpdated}件</p>
                                            <p>• 新規楽曲: {importResult.stats.songsAdded}件</p>
                                            <p>• 処理行数: {importResult.stats.totalRows}行</p>
                                        </div>
                                    )}
                                    {!importResult.success && (
                                        <p style={{ color: '#fca5a5' }}>{importResult.message}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* COLLECT CONTENT */}
                {activeTab === 'collect' && (
                    <div className="tab-content fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Collect from setlist.fm</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {selectedSfmSetlists.length > 0 && (
                                    <button
                                        onClick={handleBulkImport}
                                        className="btn-primary"
                                        style={{ background: '#22c55e', borderColor: '#22c55e', marginRight: '10px' }}
                                        disabled={isImportingSFM}
                                    >
                                        {isImportingSFM ? <Loader className="animate-spin" size={18} /> : <Download size={18} />}
                                        Import Selected ({selectedSfmSetlists.length})
                                    </button>
                                )}
                                <input
                                    type="number"
                                    value={sfmSearchYear}
                                    onChange={e => setSfmSearchYear(e.target.value)}
                                    style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', width: '100px' }}
                                />
                                <button onClick={handleSetlistFMSearch} className="btn-primary" disabled={isSearchingSFM}>
                                    {isSearchingSFM ? <Loader className="animate-spin" size={18} /> : <Search size={18} />} Search
                                </button>
                            </div>
                        </div>

                        {sfmResults.length > 0 ? (
                            <div className="table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px', textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSfmSetlists.length === sfmResults.length && sfmResults.length > 0}
                                                    onChange={toggleSelectAllSfm}
                                                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                                />
                                            </th>
                                            <th>Date</th><th>Venue</th><th>Location</th><th>Tour</th><th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sfmResults.map(result => {
                                            const hasSongs = result.sets?.set?.length > 0;
                                            const isSelected = selectedSfmSetlists.includes(result.id);
                                            const isImported = result.alreadyImported;

                                            // Conditional styling - priority: selected > imported > no songs > default
                                            let bg = 'transparent';
                                            let borderLeft = 'none';

                                            if (isSelected) {
                                                bg = 'rgba(59, 130, 246, 0.1)';
                                            } else if (isImported) {
                                                bg = 'rgba(34, 197, 94, 0.1)';
                                                borderLeft = '3px solid #22c55e';
                                            } else if (!hasSongs) {
                                                bg = 'rgba(239, 68, 68, 0.1)';
                                                borderLeft = '3px solid #ef4444';
                                            }

                                            return (
                                                <tr key={result.id} style={{ background: bg, borderLeft: borderLeft, opacity: isImported ? 0.7 : 1 }}>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSfmSelection(result.id)}
                                                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                                            disabled={isImported}
                                                        />
                                                    </td>
                                                    <td style={{ width: '120px' }}>{result.eventDate}</td>
                                                    <td style={{ fontWeight: 'bold' }}>{result.venue.name}</td>
                                                    <td style={{ color: '#cbd5e1' }}>{result.venue.city.name}, {result.venue.city.country.code}</td>
                                                    <td>{result.tour?.name || '-'}</td>
                                                    <td style={{ width: '220px' }}>
                                                        <div className="actions-wrapper">
                                                            {isImported && <span style={{ color: '#22c55e', fontSize: '0.8rem', marginRight: '5px', fontWeight: 'bold' }}>✓ Imported</span>}
                                                            {!hasSongs && !isImported && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginRight: '5px', fontWeight: 'bold' }}>No Songs</span>}
                                                            <button
                                                                onClick={() => setSfmPreviewData(result)}
                                                                className="action-btn"
                                                                title="View Setlist"
                                                                style={{ color: '#3b82f6', marginRight: '5px' }}
                                                            >
                                                                <ListMusic size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleImportFromSetlistFM(result)}
                                                                className="action-btn promote"
                                                                title="Import to DB"
                                                                disabled={isImportingSFM}
                                                            >
                                                                {isImportingSFM ? <Loader className="animate-spin" size={18} /> : <Download size={18} />}
                                                            </button>
                                                            <a
                                                                href={result.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="action-btn"
                                                                title="View on setlist.fm"
                                                                style={{ color: '#94a3b8' }}
                                                            >
                                                                <ExternalLink size={18} />
                                                            </a>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '100px 0', border: '1px dashed #334155', borderRadius: '12px', color: '#94a3b8' }}>
                                <Globe size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                                <p>Enter a year and search for UVERworld setlists on setlist.fm</p>
                            </div>
                        )}
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
                                    <option value="ONEMAN">Generic / One Man</option>
                                    <option value="ARENA">Arena / Dome</option>
                                    <option value="HALL">Hall</option>
                                    <option value="LIVEHOUSE">Live House</option>
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
                                    onChange={e => {
                                        const venue = e.target.value;
                                        let type = liveFormData.type;
                                        const v = venue.toLowerCase();

                                        // Auto-detect type from venue name
                                        if (v.includes('arena') || v.includes('dome') || v.includes('アリーナ') || v.includes('ドーム')) {
                                            type = 'ARENA';
                                        } else if (v.includes('zepp') || v.includes('coast') || v.includes('ax') || v.includes('hatch') || v.includes('pit')) {
                                            type = 'LIVEHOUSE';
                                        } else if (v.includes('hall') || v.includes('kaikan') || v.includes('会館') || v.includes('ホール')) {
                                            type = 'HALL';
                                        }

                                        setLiveFormData({ ...liveFormData, venue, type });
                                    }}
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

            {/* SETLIST PREVIEW MODAL (setlist.fm) */}
            {sfmPreviewData && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>Setlist Preview</h2>
                            <button onClick={() => setSfmPreviewData(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px' }}>{sfmPreviewData.eventDate} @ {sfmPreviewData.venue.name}</div>
                            <div style={{ color: '#94a3b8' }}>{sfmPreviewData.tour?.name || 'Unknown Tour'}</div>
                        </div>

                        <div className="setlist-preview">
                            {sfmPreviewData.sets?.set?.length > 0 ? (
                                sfmPreviewData.sets.set.map((set, setIndex) => (
                                    <div key={setIndex} style={{ marginBottom: '15px' }}>
                                        {set.encore ? (
                                            <div style={{ fontSize: '0.9rem', color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: '5px', marginBottom: '10px' }}>Encore {set.encore > 1 ? set.encore : ''}</div>
                                        ) : (
                                            <div style={{ fontSize: '0.9rem', color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: '5px', marginBottom: '10px' }}>Set {setIndex + 1}</div>
                                        )}
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {set.song.map((song, songIndex) => (
                                                <li key={songIndex} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px' }}>
                                                    <span style={{ color: '#64748b', width: '25px', textAlign: 'right' }}>{songIndex + 1}.</span>
                                                    <span>{song.name}</span>
                                                    {song.info && <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '10px', fontStyle: 'italic' }}>({song.info})</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No songs listed.</div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button type="button" onClick={() => setSfmPreviewData(null)} className="btn-cancel">Close</button>
                            <button
                                type="button"
                                onClick={() => { handleImportFromSetlistFM(sfmPreviewData); setSfmPreviewData(null); }}
                                className="btn-primary"
                                disabled={isImportingSFM}
                            >
                                <Download size={18} /> Import This Setlist
                            </button>
                        </div>
                    </div>
                </div>
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
                .admin-table th { background: rgba(0,0,0,0.2); color: #94a3b8; padding: 15px 20px; font-weight: normal; border-bottom: 2px solid #334155; }
                .admin-table td { padding: 15px 20px; border-bottom: 1px solid #1e293b; vertical-align: middle; }
                .admin-table tr:hover { background: rgba(255,255,255,0.02); }
                .actions-wrapper { display: flex; gap: 8px; justify-content: flex-start; align-items: center; }
                .action-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; transition: all 0.2s; color: #94a3b8; display: flex; align-items: center; justify-content: center; }
                .action-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
                .action-btn.edit:hover { color: #60a5fa; background: rgba(96, 165, 250, 0.1); }
                .action-btn.delete:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
                .action-btn.promote:hover { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
                .action-btn.disabled { opacity: 0.1; cursor: not-allowed; }
                .action-btn.disabled:hover { background: none; color: #94a3b8; }
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
