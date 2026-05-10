import React, { useState } from 'react';
import { Loader, ListMusic, CheckCircle, MessageCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminCorrections, useUpdateCorrectionStatus } from '../../../hooks/queries/useAdminCorrections';
import { useSongs } from '../../../hooks/queries/useSongs';
import { apiClient } from '../../../lib/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';

const AdminCorrectionsTab = () => {
    const { data: corrections = [], isLoading } = useAdminCorrections();
    const { data: songs = [] } = useSongs();
    const updateStatus = useUpdateCorrectionStatus();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState('ALL');

    const handleUpdateStatus = async (id: number, status: string, note?: string) => {
        try {
            await updateStatus.mutateAsync({ id, status, admin_note: note });
        } catch (err) {
            alert('Failed to update correction');
        }
    };

    const handleQuickCreateSong = async (title: string) => {
        if (!window.confirm(`Create new song "${title}"?`)) return;
        try {
            await apiClient.post('/api/songs', { title });
            alert(`Song "${title}" created!`);
            queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
        } catch (err) {
            alert('Failed to create song');
        }
    };

    const handleApplySetlist = async (liveId: number, setlistData: any[], correctionId: number) => {
        if (!liveId) { alert('Cannot apply: No linked Live ID'); return; }

        const resolvedSongs = setlistData.map((s: any) => {
            if (s.songId) return s;
            const match = songs.find(song => song.title.toLowerCase() === (s.clean || '').toLowerCase());
            if (match) return { ...s, songId: match.id, songTitle: match.title, isUnknown: false };
            return s;
        });
        const validSongs = resolvedSongs.filter((s: any) => s.songId);
        const unknownCount = setlistData.length - validSongs.length;

        let confirmMsg = `Apply ${validSongs.length} songs to Live #${liveId}?`;
        if (unknownCount > 0) {
            confirmMsg += `\n\nWARNING: ${unknownCount} songs (e.g. "${resolvedSongs.find((s: any) => !s.songId)?.clean}") are still unknown and will be skipped.`;
        }
        if (!window.confirm(confirmMsg)) return;

        try {
            await apiClient.put(`/api/lives/${liveId}/setlist`, { songs: validSongs.map((s: any) => s.songId) });
            alert('Setlist updated successfully!');
            if (window.confirm('Mark this correction request as RESOLVED?')) {
                handleUpdateStatus(correctionId, 'resolved', 'Setlist applied via Admin Panel');
            }
        } catch (err) {
            alert('Error updating setlist');
        }
    };

    const filtered = corrections.filter((c: any) => statusFilter === 'ALL' || c.status === statusFilter);

    if (isLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader className="spin" size={32} color="var(--primary-color)" />
        </div>
    );

    return (
        <div className="tab-content fade-in">
            <div className="table-header-panel">
                <h3>Correction Requests</h3>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
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
                        {filtered.map((correction: any) => (
                            <tr key={correction.id}>
                                <td style={{ color: '#94a3b8' }}>#{correction.id}</td>
                                <td>
                                    <span className="role-badge" style={{
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
                                    {correction.suggested_data?.setlist && (
                                        <div style={{ marginTop: '10px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '4px', padding: '10px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <ListMusic size={14} /> 解析済みデータ ({correction.suggested_data.setlist.length}曲)
                                            </div>
                                            <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '5px', marginBottom: '8px' }}>
                                                {correction.suggested_data.setlist.map((s: any, idx: number) => {
                                                    let isRecovered = false;
                                                    let renderTitle = s.songTitle || s.clean;
                                                    if (s.isUnknown) {
                                                        const match = songs.find((song: any) => song.title.toLowerCase() === (s.clean || '').toLowerCase());
                                                        if (match) { isRecovered = true; renderTitle = match.title; }
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
                                                                <button onClick={() => handleQuickCreateSong(s.clean)} style={{ fontSize: '0.7em', background: '#22c55e', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}>
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
                                            <button onClick={() => handleUpdateStatus(correction.id, 'resolved')} className="action-btn" style={{ color: '#86efac', justifyContent: 'flex-start', gap: '5px' }}>
                                                <CheckCircle size={14} /> Resolve
                                            </button>
                                        )}
                                        {correction.status === 'pending' && (
                                            <button onClick={() => handleUpdateStatus(correction.id, 'reviewed')} className="action-btn" style={{ color: '#93c5fd', justifyContent: 'flex-start', gap: '5px' }}>
                                                <MessageCircle size={14} /> Review
                                            </button>
                                        )}
                                        {correction.status !== 'rejected' && (
                                            <button
                                                onClick={() => {
                                                    const note = prompt('Reason for rejection?');
                                                    if (note) handleUpdateStatus(correction.id, 'rejected', note);
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
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="empty-cell">No correction requests found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminCorrectionsTab;
