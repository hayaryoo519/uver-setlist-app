import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useAttendance = () => {
    const { currentUser } = useAuth();
    const [attendedIds, setAttendedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            setAttendedIds(new Set()); // Reset on logout
            return;
        }

        const fetchIds = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:4000/api/users/me/attended_lives', {
                    headers: { 'token': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    // data is array of objects {id, ...}
                    setAttendedIds(new Set(data.map(live => live.id)));
                }
            } catch (err) {
                console.error("Failed to fetch attendance:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchIds();
    }, [currentUser]);

    const addLive = async (liveId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:4000/api/users/me/attended_lives', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ liveId })
            });
            if (res.ok) {
                setAttendedIds(prev => new Set(prev).add(liveId));
                return true;
            }
            return false;
        } catch (err) {
            console.error("Failed to add live:", err);
            return false;
        }
    };

    const removeLive = async (liveId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:4000/api/users/me/attended_lives/${liveId}`, {
                method: 'DELETE',
                headers: { 'token': token }
            });
            if (res.ok) {
                setAttendedIds(prev => {
                    const next = new Set(prev);
                    next.delete(liveId);
                    return next;
                });
                return true;
            }
            return false;
        } catch (err) {
            console.error("Failed to remove live:", err);
            return false;
        }
    };

    const isAttended = (liveId) => attendedIds.has(liveId);

    return {
        attendedIds,
        loading,
        addLive,
        removeLive,
        isAttended
    };
};
