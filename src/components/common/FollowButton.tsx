import React from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useFollowStats, useToggleFollow } from '../../hooks/queries/useFollow'

interface FollowButtonProps {
    targetUserId: number
    size?: 'sm' | 'md'
}

const FollowButton: React.FC<FollowButtonProps> = ({ targetUserId, size = 'md' }) => {
    const { currentUser } = useAuth()
    const { data: stats } = useFollowStats(targetUserId)
    const toggleFollow = useToggleFollow()

    if (!currentUser || currentUser.id === targetUserId) return null

    const isFollowing = stats?.is_following ?? false
    const isSm = size === 'sm'

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFollow.mutate(targetUserId)
    }

    return (
        <button
            onClick={handleClick}
            disabled={toggleFollow.isPending}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '20px',
                fontWeight: 700,
                cursor: toggleFollow.isPending ? 'not-allowed' : 'pointer',
                border: '1px solid',
                transition: 'all 0.2s',
                fontSize: isSm ? '0.72rem' : '0.875rem',
                padding: isSm ? '3px 10px' : '6px 16px',
                background: isFollowing ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.15)',
                borderColor: isFollowing ? '#475569' : '#3b82f6',
                color: isFollowing ? '#94a3b8' : '#60a5fa',
                opacity: toggleFollow.isPending ? 0.6 : 1,
                whiteSpace: 'nowrap',
            }}
        >
            {isFollowing ? (
                <>
                    <UserCheck size={isSm ? 11 : 14} />
                    フォロー中
                </>
            ) : (
                <>
                    <UserPlus size={isSm ? 11 : 14} />
                    フォロー
                </>
            )}
        </button>
    )
}

export default FollowButton
