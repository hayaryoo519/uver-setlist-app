import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMyFollowers, useMyFollowing } from '../hooks/queries/useFollow';
import SEO from '../components/SEO';

function FollowListPage() {
    const { currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') === 'following' ? 'following' : 'followers';

    const { data: followers = [], isLoading: followersLoading } = useMyFollowers(tab === 'followers' && !!currentUser);
    const { data: following = [], isLoading: followingLoading } = useMyFollowing(tab === 'following' && !!currentUser);

    const items = tab === 'followers' ? followers : following;
    const isLoading = tab === 'followers' ? followersLoading : followingLoading;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <SEO title={tab === 'followers' ? 'フォロワー' : 'フォロー中'} description="" />

            <div className="max-w-xl mx-auto px-4 pt-16 pb-20">
                <Link
                    to="/mypage"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
                >
                    <ArrowLeft size={16} /> マイページへ
                </Link>

                {/* タブ */}
                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5 mb-6">
                    <button
                        onClick={() => setSearchParams({ tab: 'followers' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                            tab === 'followers'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        フォロワー
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: 'following' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                            tab === 'following'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        フォロー中
                    </button>
                </div>

                {isLoading ? (
                    <p className="text-center text-slate-500 py-10 animate-pulse">読み込み中...</p>
                ) : items.length === 0 ? (
                    <p className="text-center text-slate-500 py-10">
                        {tab === 'followers' ? 'フォロワーがいません' : 'フォロー中のユーザーがいません'}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {items.map(user => (
                            <Link
                                key={user.id}
                                to={`/users/${user.id}`}
                                className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-yellow-500/20 rounded-2xl transition-all group"
                            >
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #d4a017 0%, #b8860b 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 900,
                                        color: '#fff',
                                        fontSize: '1rem',
                                        flexShrink: 0,
                                    }}
                                >
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-sm text-slate-200 group-hover:text-yellow-400 transition-colors">
                                    {user.username}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FollowListPage;
