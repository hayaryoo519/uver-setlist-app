import React, { useState, useMemo } from 'react';
import { Loader, ArrowUpDown, Trash2, ShieldAlert, Search } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAdminUsers, useDeleteUser, useUpdateUserRole } from '../../../hooks/queries/useAdminUsers';
import type { User } from '../../../types/api';
import { X } from 'lucide-react';

const AdminUsersTab = () => {
    const { currentUser } = useAuth();
    const { data: users = [], isLoading } = useAdminUsers();
    const deleteUser = useDeleteUser();
    const updateRole = useUpdateUserRole();

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [userToUpdate, setUserToUpdate] = useState<User | null>(null);

    const requestSort = (key: string) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const processed = useMemo(() => {
        let items = [...users];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(u => u.username.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower));
        }
        items.sort((a, b) => {
            const aVal = (a as any)[sortConfig.key];
            const bVal = (b as any)[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return items;
    }, [users, searchTerm, sortConfig]);

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await deleteUser.mutateAsync(userToDelete.id);
            setShowDeleteModal(false);
            setUserToDelete(null);
            alert('ユーザーを削除しました。');
        } catch (err) {
            alert(`削除に失敗しました: ${(err as any).data?.message || (err as any).message}`);
        }
    };

    const confirmRoleUpdate = async () => {
        if (!userToUpdate) return;
        const newRole = userToUpdate.role === 'admin' ? 'user' : 'admin';
        try {
            await updateRole.mutateAsync({ userId: userToUpdate.id, role: newRole });
            setShowRoleModal(false);
            setUserToUpdate(null);
            alert(`ユーザー権限を「${newRole}」に変更しました。`);
        } catch (err) {
            alert(`権限の変更に失敗しました: ${(err as any).data?.message || (err as any).message}`);
        }
    };

    if (isLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader className="spin" size={32} color="var(--primary-color)" />
        </div>
    );

    return (
        <div className="tab-content fade-in">
            <div className="table-header-panel">
                <h3>Registered Users</h3>
                <div style={{ position: 'relative' }}>
                    <Search size={16} className="search-icon" />
                    <input
                        type="text" placeholder="Search users..."
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('id')} className="sortable-th">ID <ArrowUpDown size={14} /></th>
                            <th onClick={() => requestSort('username')} className="sortable-th">Username <ArrowUpDown size={14} /></th>
                            <th onClick={() => requestSort('email')} className="sortable-th">Email <ArrowUpDown size={14} /></th>
                            <th onClick={() => requestSort('role')} className="sortable-th">Role <ArrowUpDown size={14} /></th>
                            <th onClick={() => requestSort('created_at')} className="sortable-th">Joined <ArrowUpDown size={14} /></th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processed.map(user => (
                            <tr key={user.id}>
                                <td style={{ width: '60px' }}>#{user.id}</td>
                                <td style={{ fontWeight: 'bold' }}>{user.username}</td>
                                <td style={{ color: '#cbd5e1' }}>{user.email}</td>
                                <td style={{ width: '100px' }}><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                                <td style={{ color: '#94a3b8', width: '120px' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                                <td style={{ width: '120px' }}>
                                    <div className="actions-wrapper">
                                        <button
                                            onClick={() => { setUserToUpdate(user); setShowRoleModal(true); }}
                                            className="action-btn promote"
                                            title="Update Role"
                                        >
                                            <ShieldAlert size={18} />
                                        </button>
                                        <button
                                            onClick={() => { setUserToDelete(user); setShowDeleteModal(true); }}
                                            disabled={!!(currentUser && user.id === currentUser.id)}
                                            className={`action-btn delete ${currentUser && user.id === currentUser.id ? 'disabled' : ''}`}
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 権限変更モーダル */}
            {showRoleModal && userToUpdate && (
                <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
                    <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">権限変更の確認</h2>
                            <button className="close-btn" onClick={() => setShowRoleModal(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ background: 'rgba(251, 191, 36, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                                    <ShieldAlert size={30} color="#fbbf24" />
                                </div>
                                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>権限を変更しますか？</h3>
                                <p style={{ color: '#94a3b8', marginBottom: '5px' }}>
                                    <strong>{userToUpdate.username}</strong> ({userToUpdate.email})
                                </p>
                                <p style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: 'bold', marginTop: '10px' }}>
                                    {userToUpdate.role} → {userToUpdate.role === 'admin' ? 'user' : 'admin'}
                                </p>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowRoleModal(false)}>キャンセル</button>
                                <button type="button" className="btn-primary" onClick={confirmRoleUpdate} disabled={updateRole.isPending}>
                                    {updateRole.isPending ? <Loader className="spin" size={18} /> : '変更する'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 削除確認モーダル */}
            {showDeleteModal && userToDelete && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">ユーザー削除の確認</h2>
                            <button className="close-btn" onClick={() => setShowDeleteModal(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                                    <Trash2 size={30} color="#ef4444" />
                                </div>
                                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>ユーザーを削除しますか？</h3>
                                <p style={{ color: '#94a3b8', marginBottom: '5px' }}>
                                    <strong>{userToDelete.username}</strong> ({userToDelete.email})
                                </p>
                                <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>この操作は取り消せません。</p>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>キャンセル</button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ background: '#ef4444', color: 'white', border: 'none' }}
                                    onClick={confirmDeleteUser}
                                    disabled={deleteUser.isPending}
                                >
                                    {deleteUser.isPending ? <Loader className="spin" size={18} /> : '削除する'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersTab;
