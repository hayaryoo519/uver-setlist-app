import React, { useState, useEffect } from 'react';
import { Shield, Users, Music, Calendar, Upload, Globe, AlertTriangle, FileText, Clock, ShieldAlert, Database, BarChart2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLives } from '../hooks/queries/useLives';
import { useSongs } from '../hooks/queries/useSongs';
import { useAdminUsers } from '../hooks/queries/useAdminUsers';
import { useAdminCorrections } from '../hooks/queries/useAdminCorrections';

import '../components/Admin/AdminPage.css';
import AdminLivesTab from '../components/Admin/tabs/AdminLivesTab';
import AdminSongsTab from '../components/Admin/tabs/AdminSongsTab';
import AdminUsersTab from '../components/Admin/tabs/AdminUsersTab';
import AdminImportTab from '../components/Admin/tabs/AdminImportTab';
import AdminCollectTab from '../components/Admin/tabs/AdminCollectTab';
import AdminDraftsTab from '../components/Admin/tabs/AdminDraftsTab';
import AdminCollectorLogsTab from '../components/Admin/tabs/AdminCollectorLogsTab';
import AdminCorrectionsTab from '../components/Admin/tabs/AdminCorrectionsTab';
import AdminBackupTab from '../components/Admin/tabs/AdminBackupTab';
import AdminStatsTab from '../components/Admin/tabs/AdminStatsTab';
import AdminSecurityLogsTab from '../components/Admin/tabs/AdminSecurityLogsTab';

type TabId = 'lives' | 'songs' | 'users' | 'import' | 'collect' | 'drafts' | 'collector_logs' | 'corrections' | 'backup' | 'stats' | 'security_logs';

const AdminPage = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const initialTab = (queryParams.get('tab') || (location.pathname === '/admin/drafts' ? 'drafts' : null)) as TabId | null;
    const editId = queryParams.get('edit');

    const [activeTab, setActiveTab] = useState<TabId>(initialTab || 'lives');

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    // Badge counts
    const { data: lives = [] } = useLives();
    const { data: songs = [] } = useSongs();
    const { data: users = [] } = useAdminUsers();
    const { data: corrections = [] } = useAdminCorrections();
    const pendingCorrections = (corrections as any[]).filter(c => c.status === 'pending').length;

    if (!currentUser || (currentUser as any).role !== 'admin') {
        return <div style={{ padding: '100px 20px', textAlign: 'center', color: '#fff' }}>Access denied.</div>;
    }

    return (
        <div style={{ padding: '100px 20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }} className="fade-in admin-page-root">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
                <Shield size={40} color="var(--primary-color)" />
                <h1 style={{ fontSize: '2.5rem', fontFamily: 'Oswald', margin: 0 }}>ADMIN DASHBOARD</h1>
            </div>

            <div className="admin-nav-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
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
                <div className={`admin-card ${activeTab === 'drafts' ? 'active' : ''}`} onClick={() => setActiveTab('drafts')}>
                    <div className="card-header">
                        <h2 className="card-title"><FileText size={24} color="#94a3b8" /> Drafts</h2>
                        <span className="card-badge" style={{ background: '#8b5cf620', color: '#a78bfa' }}>AI</span>
                    </div>
                </div>
                <div className={`admin-card ${activeTab === 'collector_logs' ? 'active' : ''}`} onClick={() => setActiveTab('collector_logs')}>
                    <div className="card-header">
                        <h2 className="card-title"><Clock size={24} color="#94a3b8" /> Collector Logs</h2>
                        <span className="card-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>LOGS</span>
                    </div>
                </div>
                <div className={`admin-card ${activeTab === 'corrections' ? 'active' : ''}`} onClick={() => setActiveTab('corrections')}>
                    <div className="card-header">
                        <h2 className="card-title"><AlertTriangle size={24} color="#94a3b8" /> Corrections</h2>
                        <span className="card-badge" style={{ background: pendingCorrections > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)' }}>
                            {pendingCorrections} / {(corrections as any[]).length}
                        </span>
                    </div>
                </div>
                <div className={`admin-card ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
                    <div className="card-header">
                        <h2 className="card-title"><Database size={24} color="#94a3b8" /> Backup</h2>
                        <span className="card-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7' }}>DB</span>
                    </div>
                </div>
                <div className={`admin-card ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
                    <div className="card-header">
                        <h2 className="card-title"><BarChart2 size={24} color="#94a3b8" /> Stats</h2>
                        <span className="card-badge" style={{ background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37' }}>KPI</span>
                    </div>
                </div>
                <div className={`admin-card ${activeTab === 'security_logs' ? 'active' : ''}`} onClick={() => setActiveTab('security_logs')}>
                    <div className="card-header">
                        <h2 className="card-title"><ShieldAlert size={24} color="#94a3b8" /> Security Logs</h2>
                        <span className="card-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>SEC</span>
                    </div>
                </div>
            </div>

            <div className="content-area">
                {activeTab === 'lives' && <AdminLivesTab initialEditId={editId ? parseInt(editId, 10) : undefined} />}
                {activeTab === 'songs' && <AdminSongsTab />}
                {activeTab === 'users' && <AdminUsersTab />}
                {activeTab === 'import' && <AdminImportTab />}
                {activeTab === 'collect' && <AdminCollectTab />}
                {activeTab === 'drafts' && <AdminDraftsTab />}
                {activeTab === 'collector_logs' && <AdminCollectorLogsTab />}
                {activeTab === 'corrections' && <AdminCorrectionsTab />}
                {activeTab === 'backup' && <AdminBackupTab />}
                {activeTab === 'stats' && <AdminStatsTab />}
                {activeTab === 'security_logs' && <AdminSecurityLogsTab />}
            </div>
        </div>
    );
};

export default AdminPage;
