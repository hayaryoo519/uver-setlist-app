import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Lock, Calendar, MapPin, Music, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import FollowButton from '../components/common/FollowButton';
import { usePublicUserProfile, useUserAttendedLives, useUserPredictions } from '../hooks/queries/useUserProfile';
import { useLiveStatsLogic } from '../hooks/useLiveStats';
import type { Live, Song } from '../types/api';

type ProfileTab = 'predictions' | 'lives' | 'songs';

function UserProfile() {
    const { id } = useParams<{ id: string }>();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<ProfileTab>('predictions');

    const userId = id ? parseInt(id, 10) : undefined;

    const { data: profile, isLoading: profileLoading } = usePublicUserProfile(userId);
    const { data: attendedLives = [], isLoading: livesLoading } = useUserAttendedLives(
        userId,
        profile?.is_public === true
    );
    const { data: predictions = [], isLoading: predictionsLoading } = useUserPredictions(userId);

    const songStats = useLiveStatsLogic(attendedLives as Live[]);

    const isOwnProfile = currentUser && profile && currentUser.id === profile.id;

    const tabs: Array<{ key: ProfileTab; label: string }> = [
        { key: 'predictions', label: `予想 (${predictions.length})` },
        { key: 'lives',       label: '参戦ライブ' },
        { key: 'songs',       label: '楽曲ランキング' },
    ];

    if (profileLoading) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
                <p className="text-slate-500 animate-pulse">読み込み中...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
                <p className="text-slate-400">ユーザーが見つかりません</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <SEO title={`${profile.username}のプロフィール`} description="" />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-20">

                {/* 戻るリンク */}
                <Link to={-1 as any} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
                    <ArrowLeft size={16} /> 戻る
                </Link>

                {/* プロフィールヘッダー */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 p-6 bg-white/[0.03] rounded-3xl border border-white/5">
                    {/* アバター */}
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #d4a017 0%, #b8860b 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            fontWeight: 900,
                            color: '#fff',
                            flexShrink: 0,
                        }}
                    >
                        {profile.username.charAt(0).toUpperCase()}
                    </div>

                    {/* ユーザー情報 */}
                    <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-2xl font-black text-white mb-3">{profile.username}</h1>

                        {/* フォロー統計 */}
                        <div className="flex items-center justify-center sm:justify-start gap-6 text-sm mb-4">
                            <span>
                                <span className="font-black text-white text-lg">{profile.following_count}</span>
                                <span className="text-slate-400 ml-1">フォロー中</span>
                            </span>
                            <span>
                                <span className="font-black text-white text-lg">{profile.follower_count}</span>
                                <span className="text-slate-400 ml-1">フォロワー</span>
                            </span>
                        </div>

                        {/* アクションボタン */}
                        {isOwnProfile ? (
                            <Link
                                to="/mypage"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:border-white/20 transition-all"
                            >
                                <User size={14} /> マイページへ
                            </Link>
                        ) : (
                            <FollowButton targetUserId={profile.id} size="md" />
                        )}
                    </div>
                </div>

                {/* タブ */}
                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5 mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab.key
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 予想タブ（常に公開） */}
                {activeTab === 'predictions' && (
                    <div className="space-y-3">
                        {predictionsLoading ? (
                            <p className="text-center text-slate-500 py-10 animate-pulse">読み込み中...</p>
                        ) : predictions.length === 0 ? (
                            <p className="text-center text-slate-500 py-10">予想がありません</p>
                        ) : (
                            predictions.map(item => (
                                <Link
                                    key={item.id}
                                    to={`/predictions/${item.id}`}
                                    className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-yellow-500/20 rounded-2xl transition-all group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-sm group-hover:text-yellow-400 transition-colors truncate">
                                            {item.title || 'セットリスト予想'}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={10} />
                                                {item.tour_name}
                                            </span>
                                            {item.venue && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={10} />
                                                    {item.venue}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 flex-shrink-0">
                                        ♥ {item.like_count}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {/* 参戦ライブタブ */}
                {activeTab === 'lives' && (
                    <div>
                        {!profile.is_public ? (
                            <div className="text-center py-16 text-slate-500">
                                <Lock size={32} className="mx-auto mb-3 opacity-40" />
                                <p className="font-bold">参戦記録は非公開です</p>
                                <p className="text-sm mt-1 text-slate-600">このユーザーは参戦記録を非公開に設定しています</p>
                            </div>
                        ) : livesLoading ? (
                            <p className="text-center text-slate-500 py-10 animate-pulse">読み込み中...</p>
                        ) : attendedLives.length === 0 ? (
                            <p className="text-center text-slate-500 py-10">参戦記録がありません</p>
                        ) : (
                            <div className="space-y-3">
                                {(attendedLives as Live[]).map(live => (
                                    <Link
                                        key={live.id}
                                        to={`/live/${live.id}`}
                                        className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-yellow-500/20 rounded-2xl transition-all group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-white text-sm group-hover:text-yellow-400 transition-colors">
                                                {live.tour_name}
                                                {live.title && <span className="text-slate-400 font-normal ml-2">{live.title}</span>}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {live.date?.replace(/-/g, '.')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={10} />
                                                    {live.venue}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 楽曲ランキングタブ */}
                {activeTab === 'songs' && (
                    <div>
                        {!profile.is_public ? (
                            <div className="text-center py-16 text-slate-500">
                                <Lock size={32} className="mx-auto mb-3 opacity-40" />
                                <p className="font-bold">楽曲ランキングは非公開です</p>
                                <p className="text-sm mt-1 text-slate-600">このユーザーは参戦記録を非公開に設定しています</p>
                            </div>
                        ) : livesLoading ? (
                            <p className="text-center text-slate-500 py-10 animate-pulse">読み込み中...</p>
                        ) : songStats.songRanking.length === 0 ? (
                            <p className="text-center text-slate-500 py-10">楽曲データがありません</p>
                        ) : (
                            <div className="space-y-2">
                                {songStats.songRanking.slice(0, 30).map((song, index) => (
                                    <Link
                                        key={song.title}
                                        to={`/song/${encodeURIComponent(song.title.replace(/\s+/g, ''))}`}
                                        className="flex items-center gap-4 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-yellow-500/20 rounded-xl transition-all group"
                                    >
                                        <div className="w-8 text-center font-mono text-xs font-black text-slate-500 group-hover:text-yellow-500">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm text-slate-200 group-hover:text-white truncate">
                                                {song.title}
                                            </div>
                                            <div className="text-xs text-slate-500">{song.album}</div>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-black text-slate-400 flex-shrink-0">
                                            <Music size={10} />
                                            {song.count}回
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserProfile;
