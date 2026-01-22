import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Users, Music, Calendar, Plus, Loader, ArrowUpDown, Trash2, Search, Edit2, ShieldAlert, X, Check, ListMusic, Upload, Globe, ExternalLink, Download, ChevronUp, ChevronDown, AlertTriangle, MessageCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SetlistEditor from '../components/Admin/SetlistEditor';

const AdminPage = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Tab State: 'users' | 'lives' | 'songs' | 'import' | 'collect'
    const [activeTab, setActiveTab] = useState('lives');
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab');
    const editId = queryParams.get('edit');



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
    const [liveFormData, setLiveFormData] = useState({ tour_name: '', title: '', date: '', venue: '', type: 'ONEMAN', special_note: '' });
    const [liveSearchTerm, setLiveSearchTerm] = useState('');
    const [liveSortConfig, setLiveSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [liveYearFilter, setLiveYearFilter] = useState('ALL');
    const [selectedLiveIds, setSelectedLiveIds] = useState([]);
    const [isDeletingLives, setIsDeletingLives] = useState(false);

    // --- IMPORT TO EXISTING LIVE STATE ---
    const [activeLiveForImport, setActiveLiveForImport] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);

    // --- SETLIST STATE ---
    const [showSetlistEditor, setShowSetlistEditor] = useState(false);
    const [selectedLiveForSetlist, setSelectedLiveForSetlist] = useState(null);

    // --- SONGS STATE ---
    const [songs, setSongs] = useState([]);
    const [isLoadingSongs, setIsLoadingSongs] = useState(false);
    const [songSearchTerm, setSongSearchTerm] = useState('');
    const [songAlbumFilter, setSongAlbumFilter] = useState('ALL');
    const [songSortConfig, setSongSortConfig] = useState({ key: 'title', direction: 'asc' });
    const [showSongModal, setShowSongModal] = useState(false);
    const [editingSong, setEditingSong] = useState(null);
    const [songFormData, setSongFormData] = useState({ title: '', album: '', release_year: '', mv_url: '', author: '' });

    // --- CORRECTIONS STATE ---
    const [corrections, setCorrections] = useState([]);
    const [isLoadingCorrections, setIsLoadingCorrections] = useState(false);
    const [correctionStatusFilter, setCorrectionStatusFilter] = useState('ALL');

    // --- COLLECT (SETLIST.FM) STATE ---
    const [sfmResults, setSfmResults] = useState([]);
    const [isSearchingSFM, setIsSearchingSFM] = useState(false);
    const [sfmSearchYear, setSfmSearchYear] = useState(new Date().getFullYear());
    const [sfmSearchKeyword, setSfmSearchKeyword] = useState('');
    const [sfmPreviewData, setSfmPreviewData] = useState(null);
    const [isImportingSFM, setIsImportingSFM] = useState(false);


    // Initial Fetch
    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'lives') fetchLives();
        if (activeTab === 'songs') fetchSongs();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'lives') fetchLives();
        if (activeTab === 'songs') fetchSongs();
        if (activeTab === 'corrections') fetchCorrections();
        // Reset keyword when switching to import/collect to avoid carrying over from modal
        if (activeTab === 'collect') {
            setSfmSearchKeyword('');
            setImportResult(null);
        }
        if (activeTab === 'import') setImportResult(null);
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
            const res = await fetch('/api/import/csv', {
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

    // --- API CALLS: CORRECTIONS ---
    const fetchCorrections = async () => {
        setIsLoadingCorrections(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/corrections', { headers: { token } });
            if (res.ok) {
                const data = await res.json();
                setCorrections(data.corrections);
            }
        } catch (err) { console.error(err); } finally { setIsLoadingCorrections(false); }
    };

    const updateCorrectionStatus = async (id, status, note) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/corrections/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify({ status, admin_note: note })
            });

            if (res.ok) {
                fetchCorrections();
            } else {
                alert('Failed to update correction');
            }
        } catch (err) { console.error(err); }
    };

    const handleQuickCreateSong = async (title) => {
        if (!window.confirm(`Create new song "${title}"?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify({ title })
            });
            if (res.ok) {
                alert(`Song "${title}" created!`);
                fetchSongs();
            } else {
                alert('Failed to create song');
            }
        } catch (err) { console.error(err); }
    };

    const handleApplySetlist = async (liveId, setlistData, correctionId) => {
        if (!liveId) {
            alert('Cannot apply: No linked Live ID');
            return;
        }

        // Dynamic matching
        const resolvedSongs = setlistData.map(s => {
            if (s.songId) return s;
            const match = songs.find(song => song.title.toLowerCase() === (s.clean || '').toLowerCase());
            if (match) return { ...s, songId: match.id, songTitle: match.title, isUnknown: false };
            return s;
        });
        const validSongs = resolvedSongs.filter(s => s.songId);
        const unknownCount = setlistData.length - validSongs.length;

        let confirmMsg = `Apply ${validSongs.length} songs to Live #${liveId}?`;
        if (unknownCount > 0) {
            confirmMsg += `\n\nWARNING: ${unknownCount} songs (e.g. "${resolvedSongs.find(s => !s.songId)?.clean}") are still unknown and will be skipped.`;
        }

        if (!window.confirm(confirmMsg)) return;

        try {
            const token = localStorage.getItem('token');
            // Format for API: { songs: [id, id, ...] }
            // API expects plain array of IDs
            const songIds = validSongs.map(s => s.songId);

            const res = await fetch(`/api/lives/${liveId}/setlist`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify({ songs: songIds })
            });

            if (res.ok) {
                alert('Setlist updated successfully!');
                // Auto-resolve the correction request
                if (window.confirm('Mark this correction request as RESOLVED?')) {
                    updateCorrectionStatus(correctionId, 'resolved', 'Setlist applied via Admin Panel');
                }
            } else {
                alert('Failed to update setlist');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating setlist');
        }
    };

    // --- API CALLS: COLLECT (SETLIST.FM) ---
    const handleSetlistFMSearch = async (overrideKeyword) => {
        const keywordToUse = typeof overrideKeyword === 'string' ? overrideKeyword : sfmSearchKeyword;
        if (!sfmSearchYear) {
            alert('Please enter a year');
            return;
        }

        setIsSearchingSFM(true);
        setSfmResults([]);
        try {
            const token = localStorage.getItem('token');
            let allResults = [];
            let page = 1;
            let totalPages = 1;

            do {
                // Respect API Rate Limits
                if (page > 1) { await new Promise(resolve => setTimeout(resolve, 1500)); }

                const res = await fetch(`/api/external/setlistfm/search?year=${sfmSearchYear}&keyword=${encodeURIComponent(keywordToUse)}&page=${page}`, {
                    headers: { token }
                });
                const data = await res.json();

                if (res.ok && data.setlist) {
                    allResults = [...allResults, ...data.setlist];
                    const itemsPerPage = data.itemsPerPage || 20;
                    totalPages = Math.ceil(data.total / itemsPerPage);
                    page++;
                } else if (page === 1) {
                    // Handle 404 or other errors as "No results found" gracefully
                    if (res.status === 404) {
                        setSfmResults([]);
                    } else {
                        alert(data.message || 'Error occurred during search');
                    }
                    break;
                } else {
                    break;
                }
            } while (page <= totalPages && page <= 10); // Check up to 10 pages (~200 items) to cover full year tours

            // Pre-process results with Heuristics and Duplicate Check
            const existingMap = new Map();
            lives.forEach(live => {
                const dateStr = new Date(live.date).toISOString().split('T')[0];
                const key = `${dateStr}_${live.venue.toLowerCase()}`;
                existingMap.set(key, live);
            });

            const processedResults = allResults.map(result => {
                const parts = result.eventDate.split('-');
                const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
                const key = `${dateStr}_${result.venue.name.toLowerCase()}`;


                let displayTourName = result.tour?.name;
                let suggestedType = 'ONEMAN';

                // Venue Type Auto-Detection
                const vName = result.venue.name.toLowerCase();
                if (vName.includes('arena') || vName.includes('dome') || vName.includes('アリーナ') || vName.includes('ドーム')) {
                    suggestedType = 'ARENA';
                } else if (vName.includes('zepp') || vName.includes('coast') || vName.includes('hatch') || vName.includes('pit') || vName.includes('ax')) {
                    suggestedType = 'LIVEHOUSE';
                } else if (vName.includes('hall') || vName.includes('kaikan') || vName.includes('会館') || vName.includes('ホール')) {
                    suggestedType = 'HALL';
                }

                let specialNote = null;

                // BIRTHDAY-BASED 生誕祭 CHECK (applies to all events)
                const dateParts = result.eventDate.split('-');
                const month = parseInt(dateParts[1]);
                const day = parseInt(dateParts[0]);
                const year = dateParts[2];

                const memberBirthdays = {
                    '12-21': 'TAKUYA∞',
                    '11-05': '真太郎',
                    '02-22': '克哉',
                    '03-08': '彰',
                    '02-14': '信人',
                    '09-25': '誠果'
                };

                const monthDay = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const memberName = memberBirthdays[monthDay];

                if (memberName) {
                    // Birthday match! This is a 生誕祭
                    specialNote = `${memberName} 生誕祭`;
                    suggestedType = 'EVENT';
                }

                // HEURISTICS FOR MISSING TOUR NAMES OR SPECIAL EVENTS
                if (!displayTourName || displayTourName.trim() === '') {
                    if (suggestedType === 'ONEMAN') suggestedType = 'EVENT'; // Only default to EVENT if no specific venue type detected
                    if (result.info) {
                        displayTourName = result.info;
                    } else {
                        // HEURISTICS FOR COMMON MISSING FESTIVALS / SPECIAL EVENTS
                        const vName = result.venue.name.toLowerCase();

                        if (vName.includes('makuhari messe') && month === 12 && day >= 28) {
                            displayTourName = `COUNTDOWN JAPAN ${year.slice(-2)}/${(parseInt(year) + 1).toString().slice(-2)}`;
                            suggestedType = 'FESTIVAL';
                        } else if (vName.includes('saitama super arena') && month === 5 && day <= 6) {
                            displayTourName = `VIVA LA ROCK ${year}`;
                            suggestedType = 'FESTIVAL';
                        } else if (vName.includes('soga') && month === 8) {
                            displayTourName = `ROCK IN JAPAN FESTIVAL ${year}`;
                            suggestedType = 'FESTIVAL';
                        } else if (vName.includes('hitachinaka') && month === 9) {
                            displayTourName = `ROCK IN JAPAN FESTIVAL ${year} in HITACHINAKA`;
                            suggestedType = 'FESTIVAL';
                        } else if (vName.includes('maizuru') && month === 4) {
                            displayTourName = `MAIZURU PLAYBACK FES. ${year}`;
                            suggestedType = 'FESTIVAL';
                        } else if (vName.includes('soga') && month === 5) { // JAPAN JAM usually at Soga in May
                            displayTourName = `JAPAN JAM ${year}`;
                            suggestedType = 'FESTIVAL';
                        } else if (vName.includes('iwamizawa') && month === 7) {
                            displayTourName = `JOIN ALIVE ${year}`;
                            suggestedType = 'FESTIVAL';
                        } else if (vName.includes('tarukawa') && month === 8) { // RISING SUN usually mid-August
                            displayTourName = `RISING SUN ROCK FESTIVAL ${year} in EZO`;
                            suggestedType = 'FESTIVAL';
                        } else if (vName.includes('sanuki') && month === 8) { // MONSTER baSH usually late August
                            displayTourName = `MONSTER baSH ${year}`;
                            suggestedType = 'FESTIVAL';
                        } else {
                            const fullText = (result.info || "") + " " + (result.tour?.name || "") + " " + result.venue.name;

                            if (fullText.includes('男祭り') || fullText.toLowerCase().includes('otokomatsuri')) {
                                specialNote = '男祭り';
                                displayTourName = `UVERworld 男祭り ${year}`;
                                suggestedType = 'EVENT';
                            } else if (fullText.includes('女祭り') || fullText.toLowerCase().includes('onnamatsuri')) {
                                specialNote = '女祭り';
                                displayTourName = `UVERworld 女祭り ${year}`;
                                suggestedType = 'EVENT';
                            } else if (fullText.includes('生誕祭') || fullText.toLowerCase().includes('seitansai')) {
                                specialNote = result.info || '生誕祭';
                                displayTourName = `${result.info || 'Member'} 生誕祭 ${year}`;
                                suggestedType = 'EVENT';
                            } else if (fullText.toLowerCase().includes('xmas') || fullText.includes('クリスマス')) {
                                specialNote = 'Xmas';
                                displayTourName = `UVERworld PREMIUM LIVE on Xmas ${year}`;
                                suggestedType = 'EVENT';
                            } else {
                                displayTourName = result.tour?.name || `${result.venue.name} Event`;
                            }
                        }
                    }
                } else {
                    // Tour name exists, check for special events in info/venue
                    const fullText = (result.info || "") + " " + result.venue.name;

                    if (!specialNote) { // Don't override birthday detection
                        if (fullText.includes('男祭り') || fullText.toLowerCase().includes('otokomatsuri')) {
                            specialNote = '男祭り';
                            suggestedType = 'EVENT';
                        } else if (fullText.includes('女祭り') || fullText.toLowerCase().includes('onnamatsuri')) {
                            specialNote = '女祭り';
                            suggestedType = 'EVENT';
                        } else if (fullText.toLowerCase().includes('xmas') || fullText.includes('クリスマス')) {
                            specialNote = 'Xmas';
                            suggestedType = 'EVENT';
                        }
                    }
                }

                const existingLive = existingMap.get(key);
                return {
                    ...result,
                    alreadyImported: !!existingLive,
                    existingLive,
                    tour: { ...result.tour, name: displayTourName },
                    suggestedType,
                    specialNote
                };
            });

            setSfmResults(processedResults);

        } catch (err) {
            console.error(err);
            alert('Failed to search setlist.fm');
        } finally {
            setIsSearchingSFM(false);
        }
    };

    // Sync alreadyImported status when lives list updates (e.g. after import or delete)
    useEffect(() => {
        setSfmResults(prevResults => {
            if (prevResults.length === 0) return prevResults;

            // Recalculate duplicate status since 'lives' changed
            const existingMap = new Map();
            lives.forEach(live => {
                const dateStr = new Date(live.date).toISOString().split('T')[0];
                const key = `${dateStr}_${live.venue.toLowerCase()}`;
                existingMap.set(key, live);
            });

            const nextResults = prevResults.map(result => {
                // Convert DD-MM-YYYY to YYYY-MM-DD for comparison
                const parts = result.eventDate.split('-');
                const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                const key = `${dateStr}_${result.venue.name.toLowerCase()}`;

                const existingLive = existingMap.get(key);
                const isImported = !!existingLive;

                // Optimization: If status hasn't changed, keep original object
                if (result.alreadyImported === isImported && result.existingLiveId === (existingLive ? existingLive.id : null)) {
                    return result;
                }

                return {
                    ...result,
                    alreadyImported: isImported,
                    existingLiveId: existingLive ? existingLive.id : null,
                    existingLive: existingLive
                };
            });

            return nextResults;
        });
    }, [lives]);

    const handleImportFromSetlistFM = async (sfmSetlist) => {
        setIsImportingSFM(true);
        try {
            const token = localStorage.getItem('token');

            // Format data for our internal API
            // Note: Our import API currently takes CSV. We should probably add a JSON import endpoint or 
            // format it as single record inserts. For simplicity, let's use the standard POST /lives and then /setlist.

            // 1. Create/Update Live
            let finalTourName = sfmSetlist.tour?.name;
            if (!finalTourName || finalTourName.trim() === '') {
                // Fallback for festivals or events without tour names
                if (sfmSetlist.info) {
                    finalTourName = sfmSetlist.info;
                } else {
                    finalTourName = `${sfmSetlist.venue.name} Event`;
                }
            }

            const liveData = {
                tour_name: finalTourName, // Improved name logic
                title: '', // Empty subtitle by default per user request
                date: sfmSetlist.eventDate.split('-').reverse().join('-'), // DD-MM-YYYY to YYYY-MM-DD
                venue: sfmSetlist.venue.name,
                type: sfmSetlist.suggestedType || (sfmSetlist.tour?.name ? 'ONEMAN' : 'EVENT'),
                special_note: sfmSetlist.specialNote || null
            };

            // Refine type detection if possible
            // if (sfmSetlist.tour?.name) liveData.type = 'ONEMAN'; // Removed to respect suggestedType

            const liveRes = await fetch('/api/lives', {
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

                    const songRes = await fetch('/api/songs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', token },
                        body: JSON.stringify({ title: sfmSong.name })
                    });
                    const sData = await songRes.json();
                    if (songRes.ok) songs.push(sData.id);
                }
            }

            if (songs.length > 0) {
                await fetch(`/api/lives/${newLive.id}/setlist`, {
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
            const res = await fetch('/api/lives?include_setlists=true');
            const data = await res.json();
            setLives(data);
        } catch (err) { console.error(err); } finally { setIsLoadingLives(false); }
    };

    const handleLiveSubmit = async (e) => {
        e.preventDefault();
        const url = editingLive ? `/api/lives/${editingLive.id}` : '/api/lives';
        const method = editingLive ? 'PUT' : 'POST';
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify(liveFormData)
            });
            if (res.ok) {
                fetchLives(); setShowLiveModal(false);
                setEditingLive(null); setLiveFormData({ tour_name: '', title: '', date: '', venue: '', type: 'ONEMAN', special_note: '' });
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Failed to save live: ${res.status} ${errorData.message || ''}`);
            }
        } catch (err) {
            console.error(err);
            alert("Error saving live: " + err.message);
        }
    };

    const handleDeleteLive = async (id) => {
        if (!window.confirm("Delete this live event?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/lives/${id}`, { method: 'DELETE', headers: { token } });
            if (res.ok) fetchLives();
            else alert('Failed to delete live');
        } catch (err) { console.error(err); alert('Error deleting live'); }
    };

    // --- DEEP LINKING EFFECTS ---
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        if (editId && lives.length > 0) {
            const liveToEdit = lives.find(l => l.id === parseInt(editId, 10));
            if (liveToEdit) {
                openEditLive(liveToEdit);
            }
        }
    }, [editId, lives]);

    // --- DELETE CONFIRMATION MODAL STATE ---
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeleteSelectedLives = () => {
        if (selectedLiveIds.length === 0) return;
        setShowDeleteConfirm(true);
    };

    const executeDeleteLives = async () => {
        setShowDeleteConfirm(false); // Close modal first
        setIsDeletingLives(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/lives/batch-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify({ ids: selectedLiveIds })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Successfully deleted ${data.count} lives.`);
                setSelectedLiveIds([]);
                fetchLives();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Failed to delete selected lives: ${res.status} ${errorData.message || ''}`);
            }
        } catch (err) {
            console.error(err);
            alert("Error during bulk delete: " + err.message);
        } finally {
            setIsDeletingLives(false);
        }
    };


    const openEditLive = (live) => {
        setEditingLive(live);
        setLiveFormData({
            tour_name: live.tour_name,
            title: live.title || '',
            date: new Date(live.date).toLocaleDateString('en-CA'), // YYYY-MM-DD in local time
            venue: live.venue,
            type: live.type || 'ONEMAN',
            special_note: live.special_note || ''
        });
        setShowLiveModal(true);
    };




    const openSetlistEditor = (live) => {
        setSelectedLiveForSetlist(live);
        setShowSetlistEditor(true);
    };

    // --- BULK DELETE LIVES ---
    const toggleLiveSelection = (id) => {
        setSelectedLiveIds(prev =>
            prev.includes(id) ? prev.filter(liveId => liveId !== id) : [...prev, id]
        );
    };

    const toggleSelectAllLives = () => {
        if (selectedLiveIds.length === processedLives.length) {
            setSelectedLiveIds([]);
        } else {
            setSelectedLiveIds(processedLives.map(l => l.id));
        }
    };




    // --- API CALLS: IMPORT TO EXISTING LIVE ---
    const openImportModal = (live) => {
        setActiveLiveForImport(live);
        setSfmSearchYear(new Date(live.date).getFullYear());
        // Clean tour name for search (remove extra details if needed, but try full first)
        setSfmSearchKeyword(live.tour_name || '');
        setSfmResults([]); // Clear previous results
        setShowImportModal(true);
        // Optional: Auto-search?
        // handleSetlistFMSearch(new Date(live.date).getFullYear());
    };

    const handleImportToExistingLive = async (setlistData) => {
        if (!activeLiveForImport) return;
        if (!confirm(`Import setlist for "${activeLiveForImport.tour_name}"? Existing setlist will be overwritten.`)) return;

        try {
            const token = localStorage.getItem('token');
            const songs = setlistData.sets.set.flatMap(s => s.song).map((s, i) => ({
                title: s.name,
                order: i + 1 // Simplified order, ideally flatten properly
            }));

            // Flatten properly for Encore handling if needed, but flatMap is ok for MVP structure
            // Actually, let's process accurate order across sets
            let flatSongs = [];
            let orderCounter = 1;
            setlistData.sets.set.forEach(set => {
                set.song.forEach(song => {
                    flatSongs.push({ title: song.name, order: orderCounter++ });
                });
            });

            const res = await fetch(`/api/lives/${activeLiveForImport.id}/import-setlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify({ songs: flatSongs })
            });

            if (res.ok) {
                alert("Setlist imported successfully!");
                setShowImportModal(false);
                fetchLives(); // Refresh list to show checkmark
            } else {
                alert("Failed to import setlist");
            }
        } catch (err) {
            console.error(err);
            alert("Error importing setlist");
        }
    };

    // --- API CALLS: SONGS ---
    const fetchSongs = async () => {
        setIsLoadingSongs(true);
        try {
            const res = await fetch('/api/songs');
            const data = await res.json();
            setSongs(data);
        } catch (err) { console.error(err); } finally { setIsLoadingSongs(false); }
    };

    const handleSongSubmit = async (e) => {
        e.preventDefault();
        const url = editingSong ? `/api/songs/${editingSong.id}` : '/api/songs';
        const method = editingSong ? 'PUT' : 'POST';

        // Sanitize data: convert empty strings to null for integer/optional fields
        const payload = {
            ...songFormData,
            release_year: songFormData.release_year === '' ? null : parseInt(songFormData.release_year),
            album: songFormData.album === '' ? null : songFormData.album,
            mv_url: songFormData.mv_url === '' ? null : songFormData.mv_url,
            author: songFormData.author === '' ? null : songFormData.author
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchSongs(); setShowSongModal(false);
                setEditingSong(null); setSongFormData({ title: '', album: '', release_year: '', mv_url: '', author: '' });
            } else {
                const data = await res.json().catch(() => ({}));
                alert(`Failed to save song: ${data.message || res.statusText}`);
            }
        } catch (err) { console.error(err); alert("Error saving song: " + err.message); }
    };

    const handleDeleteSong = async (id) => {
        if (!window.confirm("Delete this song? (If it's in a setlist, this might fail)")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/songs/${id}`, { method: 'DELETE', headers: { token } });
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

    // --- PROCESSED LIVES (FILTER & SORT) ---
    const uniqueLiveYears = useMemo(() => {
        const years = lives.map(l => new Date(l.date).getFullYear());
        return [...new Set(years)].sort((a, b) => b - a);
    }, [lives]);

    const processedLives = useMemo(() => {
        let items = [...lives];

        // Search
        if (liveSearchTerm) {
            const lower = liveSearchTerm.toLowerCase();
            items = items.filter(l =>
                l.tour_name.toLowerCase().includes(lower) ||
                l.venue.toLowerCase().includes(lower) ||
                (l.title && l.title.toLowerCase().includes(lower)) ||
                (l.special_note && l.special_note.toLowerCase().includes(lower))
            );
        }

        // Year Filter
        if (liveYearFilter !== 'ALL') {
            const y = parseInt(liveYearFilter);
            items = items.filter(l => new Date(l.date).getFullYear() === y);
        }

        // Sort
        items.sort((a, b) => {
            let aVal = a[liveSortConfig.key] || '';
            let bVal = b[liveSortConfig.key] || '';

            if (liveSortConfig.key === 'date') {
                const dateA = new Date(aVal);
                const dateB = new Date(bVal);
                return liveSortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }

            const res = String(aVal).localeCompare(String(bVal), 'ja');
            return liveSortConfig.direction === 'asc' ? res : -res;
        });

        return items;
    }, [lives, liveSearchTerm, liveYearFilter, liveSortConfig]);


    // --- API CALLS: USERS ---
    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users', { headers: { token: token } });
            if (response.ok) { const data = await response.json(); setUsers(data); }
        } catch (err) { console.error(err); } finally { setIsLoadingUsers(false); }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: { token: token } });
            if (response.ok) fetchUsers();
            else { const msg = await response.json().catch(() => "Failed"); alert(typeof msg === 'string' ? msg : "Failed to delete user"); }
        } catch (err) { console.error(err); }
    };

    const handleRoleUpdate = async (userId, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (!window.confirm(`Change role to ${newRole}?`)) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/users/${userId}/role`, {
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

    // Get unique albums for filter
    const uniqueAlbums = useMemo(() => {
        if (!songs) return [];
        const albums = songs.map(s => s.album).filter(Boolean);
        return [...new Set(albums)].sort((a, b) => a.localeCompare(b, 'ja'));
    }, [songs]);

    // Album release year mapping for release order sorting
    const albumReleaseYear = {
        'Timeless': 2006,
        'BUGRIGHT': 2007,
        'PROGLUTION': 2008,
        'AwakEVE': 2009,
        'LAST': 2010,
        'LIFE 6 SENSE': 2011,
        'THE ONE': 2012,
        'Ø CHOIR': 2014,
        'TYCOON': 2017,
        'UNSER': 2019,
        '30': 2021,
        'ENIGMASIS': 2023,
        'EPIPHANY': 2025,
        'Single': 9999,
    };

    const processedSongs = useMemo(() => {
        if (!songs) return [];
        let items = [...songs];

        // Search filter
        if (songSearchTerm) {
            const lower = songSearchTerm.toLowerCase();
            items = items.filter(s =>
                s.title.toLowerCase().includes(lower) ||
                (s.album && s.album.toLowerCase().includes(lower))
            );
        }

        // Album filter
        if (songAlbumFilter !== 'ALL') {
            items = items.filter(s => s.album === songAlbumFilter);
        }

        // Sort
        items.sort((a, b) => {
            let aVal = a[songSortConfig.key] || '';
            let bVal = b[songSortConfig.key] || '';

            // Numeric sort for ID
            if (songSortConfig.key === 'id') {
                const result = Number(aVal) - Number(bVal);
                return songSortConfig.direction === 'asc' ? result : -result;
            }

            // Release order sort (by album release year)
            if (songSortConfig.key === 'release') {
                const aYear = albumReleaseYear[a.album] || 10000;
                const bYear = albumReleaseYear[b.album] || 10000;
                const result = aYear - bYear;
                return songSortConfig.direction === 'asc' ? result : -result;
            }

            // String sort for title/album
            const result = String(aVal).localeCompare(String(bVal), 'ja');
            return songSortConfig.direction === 'asc' ? result : -result;
        });

        return items;
    }, [songs, songSearchTerm, songAlbumFilter, songSortConfig]);


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

    // --- IMPORT RESULT MODAL STATE ---
    const [importResultData, setImportResultData] = useState(null); // { success: number, failed: number }

    const closeImportResultModal = () => {
        setImportResultData(null);
        setSelectedSfmSetlists([]);
        fetchLives();
    };

    // --- BULK IMPORT HANDLER ---
    const handleBulkImport = async () => {
        setIsImportingSFM(true);
        let successCount = 0;
        let failCount = 0;

        try {
            // Filter the full results to get the selected objects
            // Also filter out already imported ones to prevent duplicates
            let selectedObjects = sfmResults.filter(r => selectedSfmSetlists.includes(r.id));

            const alreadyImportedCount = selectedObjects.filter(r => r.alreadyImported).length;
            if (alreadyImportedCount > 0) {
                // For now, simpler handling: automatically skip duplicates without blocking confirm
                selectedObjects = selectedObjects.filter(r => !r.alreadyImported);
            }

            if (selectedObjects.length === 0) {
                // If all selected were duplicates and filtered out
                setIsImportingSFM(false);
                setImportResultData({ success: 0, failed: 0, message: 'All selected items were already imported.' });
                return;
            }

            for (const setlist of selectedObjects) {
                try {
                    const token = localStorage.getItem('token');

                    // 1. Create/Update Live
                    const liveData = {
                        tour_name: setlist.tour?.name,
                        title: '', // Empty subtitle by default
                        date: setlist.eventDate.split('-').reverse().join('-'),
                        venue: setlist.venue.name,
                        type: setlist.suggestedType || 'ONEMAN',
                        special_note: setlist.specialNote || ''
                    };

                    const liveRes = await fetch('/api/lives', {
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
                                const songRes = await fetch('/api/songs', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', token },
                                    body: JSON.stringify({ title: sfmSong.name })
                                });
                                const sData = await songRes.json();
                                if (songRes.ok) songs.push(sData.id);
                            }
                        }

                        if (songs.length > 0) {
                            await fetch(`/api/lives/${newLive.id}/setlist`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', token },
                                body: JSON.stringify({ songs })
                            });
                        }
                        successCount++;
                    } else {
                        failCount++;
                        console.error('Failed to create live', newLive);
                    }

                } catch (e) {
                    console.error("Bulk Import Error for " + setlist.eventDate, e);
                    failCount++;
                }
            }

            setImportResultData({ success: successCount, failed: failCount });
            // fetchLives and clear selection will happen when modal is closed

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

                <div className={`admin-card ${activeTab === 'corrections' ? 'active' : ''}`} onClick={() => setActiveTab('corrections')}>
                    <div className="card-header">
                        <h2 className="card-title"><AlertTriangle size={24} color="#94a3b8" /> Corrections</h2>
                        <span className="card-badge" style={{ background: corrections.filter(c => c.status === 'pending').length > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)' }}>
                            {corrections.filter(c => c.status === 'pending').length} / {corrections.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="content-area">

                {/* COLLECT CONTENT */}
                {activeTab === 'collect' && (
                    <div className="tab-content fade-in">
                        <div className="table-header-panel">
                            <h3>Collect from Setlist.fm</h3>
                        </div>
                        <div className="collect-panel" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <select
                                    value={sfmSearchYear}
                                    onChange={(e) => setSfmSearchYear(e.target.value)}
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: '#fff', width: '100px', cursor: 'pointer' }}
                                >
                                    {[...Array(new Date().getFullYear() - 2000 + 2)].map((_, i) => {
                                        const y = new Date().getFullYear() + 1 - i;
                                        return <option key={y} value={y}>{y}</option>
                                    })}
                                </select>
                                <input
                                    type="text"
                                    value={sfmSearchKeyword}
                                    onChange={(e) => setSfmSearchKeyword(e.target.value)}
                                    placeholder="Optional: Keyword (Tour/Venue)"
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: '#fff', width: '250px' }}
                                />
                                <button className="btn-primary" onClick={handleSetlistFMSearch} disabled={isSearchingSFM}>
                                    {isSearchingSFM ? <Loader className="spin" size={18} /> : <Search size={18} />} Search
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {['男祭り', '女祭り', '生誕祭', 'Xmas', 'PREMIUM LIVE', 'Festival', '武道館', '横浜アリーナ', '大阪城ホール', 'マリンメッセ'].map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => {
                                            setSfmSearchKeyword(tag);
                                            handleSetlistFMSearch(tag);
                                        }}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '0.8rem',
                                            borderRadius: '15px',
                                            border: '1px solid #475569',
                                            background: sfmSearchKeyword === tag ? 'var(--primary-color)' : '#334155',
                                            color: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                                {sfmSearchKeyword && (
                                    <button onClick={() => setSfmSearchKeyword('')} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>Clear</button>
                                )}
                            </div>

                            {sfmResults.length > 0 && (
                                <div style={{ marginBottom: '15px', color: '#94a3b8' }}>
                                    Found <strong>{sfmResults.length}</strong> setlists for {sfmSearchYear}
                                </div>
                            )}

                            {sfmResults.length > 0 && (
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                    <button className="btn-secondary" onClick={toggleSelectAllSfm} style={{ fontSize: '0.9rem', padding: '5px 10px' }}>
                                        {selectedSfmSetlists.length === sfmResults.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    {selectedSfmSetlists.length > 0 && (
                                        <button
                                            className="btn-primary"
                                            onClick={(e) => { e.stopPropagation(); handleBulkImport(); }}
                                            style={{ fontSize: '0.9rem', padding: '5px 10px' }}
                                            disabled={isImportingSFM}
                                        >
                                            {isImportingSFM ? <Loader className="spin" size={16} /> : <Download size={16} />} Import Selected ({selectedSfmSetlists.length})
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="search-results" style={{ display: 'grid', gap: '10px', maxHeight: '600px', overflowY: 'auto' }}>
                                {sfmResults.length === 0 && !isSearchingSFM && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', border: '1px dashed #334155', borderRadius: '8px' }}>
                                        <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No setlists found for {sfmSearchYear}</p>
                                        <p style={{ fontSize: '0.9rem' }}>Try checking the year or clearing the keyword.</p>
                                    </div>
                                )}
                                {sfmResults.map(setlist => (
                                    <div key={setlist.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: selectedSfmSetlists.includes(setlist.id) ? '1px solid var(--primary-color)' : '1px solid #334155' }} onClick={() => toggleSfmSelection(setlist.id)}>
                                        <div style={{ width: '20px', height: '20px', marginRight: '15px', borderRadius: '4px', border: '1px solid #64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedSfmSetlists.includes(setlist.id) ? 'var(--primary-color)' : 'transparent' }}>
                                            {selectedSfmSetlists.includes(setlist.id) && <Check size={14} color="#fff" />}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{setlist.eventDate} @ {setlist.venue.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                {setlist.tour?.name || 'No Tour'}
                                                {setlist.specialNote && <span style={{ color: '#fbbf24', marginLeft: '8px' }}>({setlist.specialNote})</span>}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {setlist.alreadyImported && <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}>⚠ Already Imported</span>}
                                                {(!setlist.sets?.set || setlist.sets.set.length === 0) && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>⚠ No Songs Listed</span>}
                                            </div>
                                        </div>

                                        <div className="actions-wrapper">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSfmPreviewData(setlist); }}
                                                className="action-btn"
                                                title="View Setlist"
                                                style={{ color: '#3b82f6' }}
                                            >
                                                <ListMusic size={18} />
                                            </button>
                                            {setlist.alreadyImported && setlist.existingLive && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditLive(setlist.existingLive); }}
                                                    className="action-btn"
                                                    title="Edit Live Details"
                                                    style={{ color: '#fbbf24' }}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Import setlist for ${setlist.eventDate}?`)) {
                                                        handleImportFromSetlistFM(setlist);
                                                    }
                                                }}
                                                className="action-btn"
                                                title="Import This Setlist"
                                                style={{ color: '#22c55e' }}
                                            >
                                                <Download size={18} />
                                            </button>
                                            <a
                                                href={setlist.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="action-btn"
                                                title="Open on Setlist.fm"
                                                style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {/* CORRECTIONS CONTENT */}
                {activeTab === 'corrections' && (
                    <div className="tab-content fade-in">
                        <div className="table-header-panel">
                            <h3>Correction Requests</h3>
                            <select
                                value={correctionStatusFilter}
                                onChange={(e) => setCorrectionStatusFilter(e.target.value)}
                                style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="resolved">Resolved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Status</th>
                                        <th>Type</th>
                                        <th style={{ width: '30%' }}>Description</th>
                                        <th>Live</th>
                                        <th>User</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {corrections
                                        .filter(c => correctionStatusFilter === 'ALL' || c.status === correctionStatusFilter)
                                        .map(correction => (
                                            <tr key={correction.id}>
                                                <td style={{ color: '#94a3b8' }}>#{correction.id}</td>
                                                <td>
                                                    <span className={`role-badge ${correction.status}`} style={{
                                                        background: correction.status === 'pending' ? 'rgba(239, 68, 68, 0.2)' :
                                                            correction.status === 'resolved' ? 'rgba(34, 197, 94, 0.2)' :
                                                                correction.status === 'reviewed' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                                        color: correction.status === 'pending' ? '#fca5a5' :
                                                            correction.status === 'resolved' ? '#86efac' :
                                                                correction.status === 'reviewed' ? '#93c5fd' : '#cbd5e1'
                                                    }}>
                                                        {correction.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>{correction.correction_type}</td>
                                                <td>
                                                    <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{correction.description}</div>
                                                    {correction.suggested_data && correction.suggested_data.setlist && (
                                                        <div style={{ marginTop: '10px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '4px', padding: '10px' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <ListMusic size={14} /> 解析済みデータ ({correction.suggested_data.setlist.length}曲)
                                                            </div>
                                                            <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '5px', marginBottom: '8px' }}>
                                                                {correction.suggested_data.setlist.map((s, idx) => {
                                                                    // Dynamic check
                                                                    let isRecovered = false;
                                                                    let renderTitle = s.songTitle || s.clean;
                                                                    if (s.isUnknown) {
                                                                        const match = songs.find(song => song.title.toLowerCase() === (s.clean || '').toLowerCase());
                                                                        if (match) {
                                                                            isRecovered = true;
                                                                            renderTitle = match.title;
                                                                        }
                                                                    }

                                                                    return (
                                                                        <div key={idx} style={{ color: s.isUnknown && !isRecovered ? '#fca5a5' : '#cbd5e1', display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                                                <span>{idx + 1}.</span>
                                                                                <span>{renderTitle}</span>
                                                                                {s.isUnknown && !isRecovered && <span style={{ color: '#fca5a5', fontSize: '0.7em' }}>UNKNOWN</span>}
                                                                                {isRecovered && <CheckCircle size={12} color="#4ade80" />}
                                                                            </div>
                                                                            {s.isUnknown && !isRecovered && (
                                                                                <button
                                                                                    onClick={() => handleQuickCreateSong(s.clean)}
                                                                                    style={{ fontSize: '0.7em', background: '#22c55e', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}
                                                                                >
                                                                                    + Create
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {correction.status !== 'resolved' && (
                                                                <button
                                                                    onClick={() => handleApplySetlist(correction.live_id, correction.suggested_data.setlist, correction.id)}
                                                                    className="action-btn"
                                                                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px', background: '#38bdf8', color: '#0f172a', justifyContent: 'center', fontWeight: 'bold', gap: '5px' }}
                                                                >
                                                                    <CheckCircle size={14} /> このセットリストを適用
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {correction.admin_note && (
                                                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                            <strong style={{ color: '#fbbf24' }}>Admin Note:</strong> {correction.admin_note}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {correction.live_id ? (
                                                        <Link to={`/live/${correction.live_id}`} target="_blank" style={{ color: '#fbbf24' }}>{correction.live_tour_name || 'View Live'}</Link>
                                                    ) : (
                                                        <div style={{ fontSize: '0.9rem' }}>
                                                            <div>{correction.live_date}</div>
                                                            <div>{correction.live_venue}</div>
                                                            <div>{correction.live_title}</div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{correction.submitter_name || 'Unknown'}</td>
                                                <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(correction.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                        {correction.status !== 'resolved' && (
                                                            <button onClick={() => updateCorrectionStatus(correction.id, 'resolved')} className="action-btn" style={{ color: '#86efac', justifyContent: 'flex-start', gap: '5px' }}>
                                                                <CheckCircle size={14} /> Resolve
                                                            </button>
                                                        )}
                                                        {correction.status === 'pending' && (
                                                            <button onClick={() => updateCorrectionStatus(correction.id, 'reviewed')} className="action-btn" style={{ color: '#93c5fd', justifyContent: 'flex-start', gap: '5px' }}>
                                                                <MessageCircle size={14} /> Review
                                                            </button>
                                                        )}
                                                        {correction.status !== 'rejected' && (
                                                            <button
                                                                onClick={() => {
                                                                    const note = prompt('Reason for rejection?');
                                                                    if (note) updateCorrectionStatus(correction.id, 'rejected', note);
                                                                }}
                                                                className="action-btn"
                                                                style={{ color: '#fca5a5', justifyContent: 'flex-start', gap: '5px' }}
                                                            >
                                                                <X size={14} /> Reject
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    {corrections.filter(c => correctionStatusFilter === 'ALL' || c.status === correctionStatusFilter).length === 0 && (
                                        <tr><td colSpan="8" className="empty-cell">No correction requests found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}



                {/* LIVES CONTENT */}
                {activeTab === 'lives' && (
                    <div className="tab-content fade-in">
                        <div className="table-header-panel">
                            <h3>Live Events</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {selectedLiveIds.length > 0 && (
                                    <button
                                        className="btn-primary"
                                        style={{ width: 'auto', background: '#ef4444', color: '#fff' }}
                                        onClick={handleDeleteSelectedLives}
                                        disabled={isDeletingLives}
                                    >
                                        {isDeletingLives ? <Loader className="spin" size={18} /> : <Trash2 size={18} />} Delete Selected ({selectedLiveIds.length})
                                    </button>
                                )}
                                <button className="btn-primary" style={{ width: 'auto' }} onClick={() => {
                                    setEditingLive(null); setLiveFormData({ tour_name: '', title: '', date: '', venue: '', type: 'ONEMAN', special_note: '' });
                                    setShowLiveModal(true);
                                }}>
                                    <Plus size={18} /> Add New Live
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} className="search-icon" />
                                <input
                                    type="text" placeholder="Search lives..."
                                    value={liveSearchTerm} onChange={(e) => setLiveSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                            <select
                                value={liveYearFilter}
                                onChange={(e) => setLiveYearFilter(e.target.value)}
                                style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                            >
                                <option value="ALL">All Years</option>
                                {uniqueLiveYears.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <select
                                value={`${liveSortConfig.key}-${liveSortConfig.direction}`}
                                onChange={(e) => {
                                    const [key, dir] = e.target.value.split('-');
                                    setLiveSortConfig({ key, direction: dir });
                                }}
                                style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                            >
                                <option value="date-desc">Date (Newest)</option>
                                <option value="date-asc">Date (Oldest)</option>
                                <option value="tour_name-asc">Tour (A-Z)</option>
                                <option value="tour_name-desc">Tour (Z-A)</option>
                                <option value="venue-asc">Venue (A-Z)</option>
                                <option value="venue-desc">Venue (Z-A)</option>
                            </select>


                        </div>

                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px', padding: '0 10px', textAlign: 'center' }}>
                                            <div
                                                onClick={toggleSelectAllLives}
                                                style={{
                                                    width: '18px', height: '18px', border: '1px solid #64748b', borderRadius: '4px', cursor: 'pointer',
                                                    background: selectedLiveIds.length > 0 && selectedLiveIds.length === processedLives.length ? 'var(--primary-color)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                {selectedLiveIds.length > 0 && selectedLiveIds.length === processedLives.length && <Check size={14} color="#000" />}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => setLiveSortConfig(prev => ({ key: 'date', direction: prev.key === 'date' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                            className="sortable-th"
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                Date
                                                {liveSortConfig.key === 'date' ? (
                                                    liveSortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => setLiveSortConfig(prev => ({ key: 'tour_name', direction: prev.key === 'tour_name' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                            className="sortable-th"
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                Tour Name
                                                {liveSortConfig.key === 'tour_name' ? (
                                                    liveSortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => setLiveSortConfig(prev => ({ key: 'venue', direction: prev.key === 'venue' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                            className="sortable-th"
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                Venue
                                                {liveSortConfig.key === 'venue' ? (
                                                    liveSortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                                            </div>
                                        </th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Setlist</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedLives.map(live => (
                                        <tr key={live.id} style={{ background: selectedLiveIds.includes(live.id) ? 'rgba(34, 197, 94, 0.1)' : 'transparent' }}>
                                            <td style={{ padding: '0 10px', textAlign: 'center' }}>
                                                <div
                                                    onClick={() => toggleLiveSelection(live.id)}
                                                    style={{
                                                        width: '18px', height: '18px', border: '1px solid #64748b', borderRadius: '4px', cursor: 'pointer', margin: '0 auto',
                                                        background: selectedLiveIds.includes(live.id) ? 'var(--primary-color)' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                >
                                                    {selectedLiveIds.includes(live.id) && <Check size={14} color="#000" />}
                                                </div>
                                            </td>
                                            <td style={{ width: '120px' }}>{new Date(live.date).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>
                                                    {live.tour_name}
                                                    {live.special_note && <span style={{ color: '#fbbf24', marginLeft: '8px' }}>({live.special_note})</span>}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{live.title}</div>
                                                {live.type && <span className="badge">{live.type}</span>}
                                            </td>
                                            <td>{live.venue}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {live.setlist && live.setlist.length > 0 ? (
                                                    <div className="flex items-center justify-center gap-1" title={`${live.setlist.length} songs`}>
                                                        <Check size={16} className="text-emerald-400" />
                                                        <span className="text-xs text-slate-400">({live.setlist.length})</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center" title="No setlist">
                                                        <X size={16} className="text-slate-600" />
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ width: '180px' }}>
                                                <div className="actions-wrapper">
                                                    <button onClick={() => openEditLive(live)} className="action-btn" title="Edit Live" style={{ color: '#fbbf24' }}>
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button onClick={() => openSetlistEditor(live)} className="action-btn" title="Edit Setlist" style={{ color: '#3b82f6' }}>
                                                        <ListMusic size={18} />
                                                    </button>
                                                    <button onClick={() => {
                                                        const dateObj = new Date(live.date);
                                                        const dateStr = dateObj.toLocaleDateString('en-GB').split('/').join('-'); // DD-MM-YYYY approx or just use standard query
                                                        // Actually SetlistFM query works with YYYY-MM-DD
                                                        const y = dateObj.getFullYear();
                                                        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                                                        const d = String(dateObj.getDate()).padStart(2, '0');
                                                        const query = `UVERworld ${y}-${m}-${d}`;
                                                        window.open(`https://www.setlist.fm/search?query=${encodeURIComponent(query)}`, '_blank');
                                                    }} className="action-btn" title="Search on Setlist.fm" style={{ color: '#8b5cf6' }}>
                                                        <Search size={18} />
                                                    </button>
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
                            <h3>Songs Master ({processedSongs.length} / {songs.length})</h3>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} className="search-icon" />
                                    <input
                                        type="text" placeholder="Search songs..."
                                        value={songSearchTerm} onChange={(e) => setSongSearchTerm(e.target.value)}
                                        className="search-input"
                                    />
                                </div>
                                <select
                                    value={songAlbumFilter}
                                    onChange={(e) => setSongAlbumFilter(e.target.value)}
                                    style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                                >
                                    <option value="ALL">すべてのアルバム</option>
                                    {uniqueAlbums.map(album => (
                                        <option key={album} value={album}>{album}</option>
                                    ))}
                                </select>
                                <select
                                    value={`${songSortConfig.key}-${songSortConfig.direction}`}
                                    onChange={(e) => {
                                        const [key, dir] = e.target.value.split('-');
                                        setSongSortConfig({ key, direction: dir });
                                    }}
                                    style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                                >
                                    <option value="release-asc">公開順（古い→新しい）</option>
                                    <option value="release-desc">公開順（新しい→古い）</option>
                                    <option value="title-asc">タイトル A→Z</option>
                                    <option value="title-desc">タイトル Z→A</option>
                                    <option value="album-asc">アルバム A→Z</option>
                                    <option value="album-desc">アルバム Z→A</option>
                                    <option value="id-asc">ID 昇順</option>
                                    <option value="id-desc">ID 降順</option>
                                </select>
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
                                <thead>
                                    <tr>
                                        <th
                                            style={{ width: '60px', cursor: 'pointer' }}
                                            onClick={() => setSongSortConfig(prev => ({ key: 'id', direction: prev.key === 'id' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                            className="sortable-th"
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>ID<ArrowUpDown size={14} style={{ opacity: songSortConfig.key === 'id' ? 1 : 0.3 }} /></span>
                                        </th>
                                        <th
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSongSortConfig(prev => ({ key: 'title', direction: prev.key === 'title' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                            className="sortable-th"
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Title<ArrowUpDown size={14} style={{ opacity: songSortConfig.key === 'title' ? 1 : 0.3 }} /></span>
                                        </th>
                                        <th
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSongSortConfig(prev => ({ key: 'album', direction: prev.key === 'album' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                            className="sortable-th"
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Album<ArrowUpDown size={14} style={{ opacity: songSortConfig.key === 'album' ? 1 : 0.3 }} /></span>
                                        </th>
                                        <th style={{ width: '100px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedSongs.map(song => (
                                        <tr key={song.id}>
                                            <td style={{ color: '#94a3b8' }}>#{song.id}</td>
                                            <td style={{ fontWeight: 'bold' }}>
                                                <Link to={`/song/${encodeURIComponent(song.title)}`} style={{ color: '#e2e8f0', textDecoration: 'none' }} className="hover-link">
                                                    {song.title}
                                                </Link>
                                            </td>
                                            <td style={{ color: '#64748b', fontSize: '0.9rem' }}>{song.album || '-'}</td>
                                            <td>
                                                <div className="actions-wrapper">
                                                    <button onClick={() => openEditSong(song)} className="action-btn edit" title="Edit"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDeleteSong(song.id)} className="action-btn delete" title="Delete"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {processedSongs.length === 0 && <tr><td colSpan="4" className="empty-cell">No songs found.</td></tr>}
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
                            <div className="form-group">
                                <label>Special Note (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="例: TAKUYA∞ 生誕祭、男祭り、Xmas"
                                    value={liveFormData.special_note || ''}
                                    onChange={e => setLiveFormData({ ...liveFormData, special_note: e.target.value })}
                                />
                                <small style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                                    特別イベント情報（生誕祭、男祭り、女祭り、Xmas等）
                                </small>
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
                    onEditLive={() => {
                        setShowSetlistEditor(false);
                        openEditLive(selectedLiveForSetlist);
                    }}
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
            {/* IMPORT MODAL FOR EXISTING LIVE */}
            {showImportModal && activeLiveForImport && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-content large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Find Setlist for: {activeLiveForImport.tour_name} ({new Date(activeLiveForImport.date).toLocaleDateString()})</h3>
                            <button onClick={() => setShowImportModal(false)} className="close-btn"><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="control-bar" style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="number"
                                    value={sfmSearchYear}
                                    onChange={(e) => setSfmSearchYear(e.target.value)}
                                    placeholder="Year"
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', width: '80px' }}
                                />
                                <input
                                    type="text"
                                    value={sfmSearchKeyword}
                                    onChange={(e) => setSfmSearchKeyword(e.target.value)}
                                    placeholder="Tour Name / Keyword"
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', flex: 1 }}
                                />
                                <button onClick={handleSetlistFMSearch} disabled={isSearchingSFM} className="btn-primary">
                                    {isSearchingSFM ? <Loader className="spin" size={16} /> : <Search size={16} />} Search
                                </button>
                            </div>

                            <div className="sfm-results-list" style={{ marginTop: '20px', maxHeight: '600px', overflowY: 'auto' }}>
                                {sfmResults.length === 0 && !isSearchingSFM && (
                                    <p style={{ color: '#94a3b8', textAlign: 'center' }}>Search to find setlists...</p>
                                )}
                                {sfmResults.map(setlist => (
                                    <div key={setlist.id} className="sfm-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>{setlist.venue?.name}</div>
                                                <div style={{ color: '#94a3b8' }}>{setlist.eventDate} - {setlist.tour?.name || 'No Tour Name'}</div>
                                                <div style={{ marginTop: '8px' }}>
                                                    {setlist.sets?.set?.length > 0 ? (
                                                        <span className="badge" style={{ background: '#059669', color: '#fff' }}>
                                                            {setlist.sets.set.reduce((acc, s) => acc + s.song.length, 0)} songs
                                                        </span>
                                                    ) : (
                                                        <span className="badge" style={{ background: '#f59e0b', color: '#000' }}>⚠ No Songs Listed</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleImportToExistingLive(setlist)}
                                                className="btn-primary"
                                                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                                                disabled={!setlist.sets?.set?.length}
                                            >
                                                <Download size={16} /> Import This
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Confirm Deletion</h2>

                        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                            <ShieldAlert size={56} color="var(--secondary-color)" style={{ margin: '0 auto 15px', display: 'block' }} />
                            <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
                                Are you sure you want to delete <strong>{selectedLiveIds.length}</strong> lives?
                            </p>
                            <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>This action cannot be undone.</p>
                        </div>

                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button
                                className="btn-primary"
                                style={{ background: 'var(--secondary-color)', color: '#fff', border: 'none' }}
                                onClick={executeDeleteLives}
                            >
                                <Trash2 size={16} /> Delete Forever
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* IMPORT RESULT MODAL */}
            {importResultData && (
                <div className="modal-overlay" onClick={closeImportResultModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Import Complete</h2>

                        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                            <Check size={56} color="var(--primary-color)" style={{ margin: '0 auto 15px', display: 'block' }} />
                            <p style={{ fontSize: '1.2rem', marginBottom: '15px' }}>
                                Processed <strong>{importResultData.success + importResultData.failed}</strong> items.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.95rem' }}>
                                <div style={{ color: '#22c55e' }}>
                                    Success: <strong>{importResultData.success}</strong>
                                </div>
                                <div style={{ color: '#ef4444' }}>
                                    Failed: <strong>{importResultData.failed}</strong>
                                </div>
                            </div>
                            {importResultData.message && <p style={{ marginTop: '15px', opacity: 0.8 }}>{importResultData.message}</p>}
                        </div>

                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <button
                                className="btn-primary"
                                style={{ width: '100%' }}
                                onClick={closeImportResultModal}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
