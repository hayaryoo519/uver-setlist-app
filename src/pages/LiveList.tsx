import React, { useState, useMemo, useEffect } from 'react';
import type { Live } from '../types/api';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, Check, Plus, ArrowRight, Loader, Filter, X } from 'lucide-react';
import { useAttendance } from '../hooks/useAttendance';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { useLives } from '../hooks/queries/useLives';
import { useSongs } from '../hooks/queries/useSongs';
import { DISCOGRAPHY } from '../data/discography';
import './LiveListPrototype.css';

const LiveList = () => {
    const { currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const selectedYear = searchParams.get('year');
    const navigate = useNavigate();

    const initialFilters = {
        text: '',
        venue: '',
        songIds: [] as number[],
        startDate: '',
        endDate: '',
        types: [] as string[],
        ...location.state?.filters,
    };
    const [filters, setFilters] = useState(initialFilters);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const { addLive, removeLive, isAttended } = useAttendance();

    const queryParams = {
        songIds: filters.songIds,
        startDate: filters.startDate,
        endDate: filters.endDate,
    };

    const { data: fetchedLives = [], isLoading } = useLives(queryParams);
    const { data: availableSongs = [] } = useSongs();

    const lives = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return (fetchedLives as Live[]).filter(live => new Date(live.date) < today);
    }, [fetchedLives]);

    const handleFilterChange = (newFilters: any) => {
        setFilters(newFilters);
        navigate(location.pathname, { replace: true, state: { filters: newFilters } });
    };

    const toggleType = (type: string) => {
        const current: string[] = filters.types || [];
        const newTypes = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        handleFilterChange({ ...filters, types: newTypes });
    };

    const clearAllFilters = () => {
        handleFilterChange({ text: '', venue: '', songIds: [], startDate: '', endDate: '', types: [] });
        setSearchParams({});
    };

    const handleToggleAttendance = async (e: React.MouseEvent, liveId: number | string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUser) {
            if (window.confirm("参戦記録をつけるにはログインが必要です。\nログインページに移動しますか？")) {
                navigate('/login', { state: { from: location.pathname + location.search } });
            }
            return;
        }
        const success = isAttended(liveId) ? await removeLive(liveId) : await addLive(liveId);
        if (!success) alert("エラーが発生しました。ログイン状態を確認してください。");
    };

    type YearSummary = { year: number; performanceCount: number; lives: Live[] };
    const annualSummaries = useMemo(() => {
        const summaries: Record<number, YearSummary> = {};
        lives.forEach(live => {
            if (!live.date) return;
            const dateObj = new Date(live.date);
            if (isNaN(dateObj.getTime())) return;
            const year = dateObj.getFullYear();
            if (!summaries[year]) summaries[year] = { year, performanceCount: 0, lives: [] };
            summaries[year].performanceCount += 1;
            summaries[year].lives.push(live);
        });
        return Object.values(summaries)
            .map(s => ({ ...s, lives: s.lives.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }))
            .sort((a, b) => b.year - a.year);
    }, [lives]);

    const filteredLives = useMemo(() => {
        return lives.filter(live => {
            if (selectedYear) {
                if (new Date(live.date).getFullYear().toString() !== selectedYear) return false;
            }
            if (filters.text) {
                const q = filters.text.toLowerCase();
                const venue = typeof live.venue === 'object' ? ((live.venue as any)?.name || '') : (live.venue || '');
                const tour = typeof live.tour_name === 'object' ? ((live.tour_name as any)?.name || '') : (live.tour_name || '');
                if (
                    !tour.toLowerCase().includes(q) &&
                    !(live.title || '').toLowerCase().includes(q) &&
                    !venue.toLowerCase().includes(q) &&
                    !(live.special_note?.toLowerCase() || '').includes(q)
                ) return false;
            }
            if (filters.types?.length > 0 && !filters.types.includes(live.type)) return false;
            return true;
        });
    }, [lives, filters.text, filters.types, selectedYear]);

    // フィルターなし全期間 → 年別グループ表示
    const showGroupedView = !selectedYear && !filters.text && !filters.types?.length && !filters.songIds?.length;

    const activeFilterCount = (filters.types?.length || 0) + (filters.songIds?.length || 0);

    const selectedSongName = useMemo(() => {
        if (!filters.songIds?.length) return null;
        return (availableSongs as any[]).find(s => s.id === filters.songIds[0])?.title || null;
    }, [filters.songIds, availableSongs]);

    const handleSongChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = parseInt(e.target.value);
        handleFilterChange({ ...filters, songIds: id ? [id] : [] });
    };

    const songOptions = useMemo(() => {
        const songMap = new Map<string, number>();
        (availableSongs as any[]).forEach(s => songMap.set(s.title, s.id));
        return (DISCOGRAPHY as any[]).map((release, i) => {
            const songs = release.songs
                .map((title: string) => ({ title, id: songMap.get(title) }))
                .filter((s: any) => s.id !== undefined);
            if (!songs.length) return null;
            return (
                <optgroup key={`${release.title}-${i}`} label={release.title}>
                    {songs.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </optgroup>
            );
        });
    }, [availableSongs]);

    useEffect(() => {
        document.body.classList.add('prototype-active');
        return () => document.body.classList.remove('prototype-active');
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900">
                <Loader className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    const getVenueName = (venue: any) => typeof venue === 'object' ? (venue?.name || '') : (venue || '');

    const renderLiveCard = (live: Live, idx: number) => (
        <Link
            key={live.id}
            to={`/live/${live.id}`}
            className="tour-horizontal-card fade-in"
            style={{ animationDelay: `${idx * 0.05}s`, textDecoration: 'none', color: 'inherit', display: 'flex', overflow: 'hidden' }}
        >
            <div className="card-column tour-name-col desktop-only">
                <label>ツアー / ライブ名</label>
                <h3 className="tour-name-text">
                    <span className={`mobile-type-badge ${live.type === 'FESTIVAL' ? 'badge-fes-m' : live.type === 'EVENT' ? 'badge-event-m' : 'badge-oneman-m'}`}>
                        {live.type === 'FESTIVAL' ? 'FES' : live.type === 'EVENT' ? 'EVENT' : 'ワンマン'}
                    </span>
                    <span className="title-text-wrap">
                        {live.title || (typeof live.tour_name === 'object' ? (live.tour_name as any)?.name : live.tour_name)}
                    </span>
                    {live.setlist_status === 'UNKNOWN_SETLIST' && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', whiteSpace: 'nowrap', marginLeft: '6px', verticalAlign: 'middle' }}>
                            未登録
                        </span>
                    )}
                </h3>
            </div>
            <div className="card-column period-col desktop-only">
                <label>開催日</label>
                <div className="period-text">
                    {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                </div>
            </div>
            <div className="card-column shows-col desktop-only">
                <label>会場</label>
                <div className="shows-text">{getVenueName(live.venue)}</div>
            </div>

            <div className="card-main-info mobile-only">
                <div className="card-header-row">
                    <span className="card-date-text">
                        {new Date(live.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                    </span>
                    <span className={`mobile-type-badge ${live.type === 'FESTIVAL' ? 'badge-fes-m' : live.type === 'EVENT' ? 'badge-event-m' : 'badge-oneman-m'}`}>
                        {live.type === 'FESTIVAL' ? 'FES' : live.type === 'EVENT' ? 'EVENT' : 'ワンマン'}
                    </span>
                </div>
                <h3 className="card-title-text">
                    {live.title || (typeof live.tour_name === 'object' ? (live.tour_name as any)?.name : live.tour_name)}
                    {live.setlist_status === 'UNKNOWN_SETLIST' && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', whiteSpace: 'nowrap', marginLeft: '6px', verticalAlign: 'middle' }}>
                            未登録
                        </span>
                    )}
                </h3>
                <div className="card-venue-row">
                    <MapPin size={14} />
                    <span>{getVenueName(live.venue)}</span>
                </div>
            </div>

            <div className="card-actions-col">
                <div
                    className={`card-action-btn-mock ${isAttended(live.id) ? 'attended' : ''}`}
                    onClick={e => { e.stopPropagation(); handleToggleAttendance(e, live.id); }}
                >
                    {isAttended(live.id)
                        ? <><Check size={14} strokeWidth={3} /><span>参戦済</span></>
                        : <><Plus size={14} strokeWidth={3} /><span>参戦記録</span></>
                    }
                </div>
                <div className="card-arrow-link desktop-only"><ArrowRight size={20} /></div>
            </div>
        </Link>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white fade-in">
            <SEO title="Live Archive" description="Search UVERworld past setlists and live history." />

            <div className="live-list-layout">
                <aside className="live-sidebar">
                    <div className="sidebar-group">
                        <div className="sidebar-label">年度フィルター</div>
                        <div className="sidebar-items">
                            <div className={`sidebar-item ${!selectedYear ? 'active' : ''}`} onClick={() => setSearchParams({})}>
                                <Calendar size={18} className="sidebar-icon" />
                                <span className="sidebar-text">全期間</span>
                                <span className="sidebar-count">{lives.length}</span>
                            </div>
                            {annualSummaries.map(summary => (
                                <div
                                    key={summary.year}
                                    className={`sidebar-item ${selectedYear === summary.year.toString() ? 'active' : ''}`}
                                    onClick={() => setSearchParams({ year: summary.year.toString() })}
                                >
                                    <Calendar size={18} className="sidebar-icon" />
                                    <span className="sidebar-text">{summary.year}</span>
                                    <span className="sidebar-count">{summary.performanceCount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="live-main-content">
                    <div className="live-main-inner">
                        <header className="archive-header">
                            <div className="header-top-row">
                                <Link to="/" className="header-back-btn">
                                    <ArrowRight size={20} className="rotate-180" />
                                </Link>
                                <h1 className="archive-title">LIVE TOUR ARCHIVE</h1>
                            </div>

                            {/* 検索バー */}
                            <div className="archive-search-row">
                                <div className="archive-search-input-wrap">
                                    <Search size={15} className="archive-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="ツアー名・会場で検索"
                                        value={filters.text}
                                        onChange={e => handleFilterChange({ ...filters, text: e.target.value })}
                                        className="archive-search-input"
                                    />
                                    {filters.text && (
                                        <button className="archive-search-clear" onClick={() => handleFilterChange({ ...filters, text: '' })}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* デスクトップ: 種別 + 楽曲フィルター */}
                            <div className="archive-filter-row desktop-only">
                                <div className="type-filter-pills">
                                    {(['ONEMAN', 'FESTIVAL', 'EVENT'] as const).map(t => (
                                        <button
                                            key={t}
                                            className={`type-pill type-pill-${t.toLowerCase()} ${filters.types?.includes(t) ? 'active' : ''}`}
                                            onClick={() => toggleType(t)}
                                        >
                                            {t === 'FESTIVAL' ? 'FES' : t === 'EVENT' ? 'EVENT' : 'ワンマン'}
                                        </button>
                                    ))}
                                </div>
                                <div className="song-filter-wrap">
                                    <span className="song-filter-icon">♫</span>
                                    <select
                                        value={(filters.songIds && filters.songIds[0]) || ''}
                                        onChange={handleSongChange}
                                        className="song-filter-select"
                                        disabled={(availableSongs as any[]).length === 0}
                                    >
                                        <option value="">すべての楽曲</option>
                                        {songOptions}
                                    </select>
                                </div>
                            </div>
                        </header>

                        {/* モバイル年タブ */}
                        <div className="mobile-tab-nav">
                            <div className="mobile-tab-scroll">
                                <button className={`mobile-tab-btn ${!selectedYear ? 'active' : ''}`} onClick={() => setSearchParams({})}>
                                    全期間
                                </button>
                                {annualSummaries.map(summary => (
                                    <button
                                        key={summary.year}
                                        className={`mobile-tab-btn ${selectedYear === summary.year.toString() ? 'active' : ''}`}
                                        onClick={() => setSearchParams({ year: summary.year.toString() })}
                                    >
                                        {summary.year}
                                    </button>
                                ))}
                            </div>
                            {/* モバイル絞込ボタン */}
                            <button
                                className={`mobile-filter-btn mobile-only ${isFilterOpen ? 'active' : ''}`}
                                onClick={() => setIsFilterOpen(v => !v)}
                            >
                                <Filter size={14} />
                                {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
                            </button>
                        </div>

                        {/* モバイル絞込パネル */}
                        {isFilterOpen && (
                            <div className="mobile-filter-panel mobile-only">
                                <div className="type-filter-pills">
                                    {(['ONEMAN', 'FESTIVAL', 'EVENT'] as const).map(t => (
                                        <button
                                            key={t}
                                            className={`type-pill type-pill-${t.toLowerCase()} ${filters.types?.includes(t) ? 'active' : ''}`}
                                            onClick={() => toggleType(t)}
                                        >
                                            {t === 'FESTIVAL' ? 'FES' : t === 'EVENT' ? 'EVENT' : 'ワンマン'}
                                        </button>
                                    ))}
                                </div>
                                <div className="song-filter-wrap">
                                    <span className="song-filter-icon">♫</span>
                                    <select
                                        value={(filters.songIds && filters.songIds[0]) || ''}
                                        onChange={handleSongChange}
                                        className="song-filter-select"
                                        disabled={(availableSongs as any[]).length === 0}
                                    >
                                        <option value="">すべての楽曲</option>
                                        {songOptions}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="archive-stats-strip" />

                        {showGroupedView ? (
                            <div className="archive-list-container p-5">
                                {annualSummaries.map(summary => (
                                    <section key={summary.year} className="year-section">
                                        <div className="year-section-header">
                                            <span className="section-year">{summary.year}</span>
                                        </div>
                                        <div className="space-y-4">
                                            {summary.lives.map((live, idx) => renderLiveCard(live, idx))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <div className="filtered-list-container">
                                {/* アクティブフィルターチップ */}
                                {activeFilterCount > 0 && (
                                    <div className="active-filter-chips">
                                        {(filters.types || []).map((t: string) => (
                                            <span key={t} className={`filter-chip filter-chip-${t.toLowerCase()}`}>
                                                {t === 'FESTIVAL' ? 'FES' : t === 'EVENT' ? 'EVENT' : 'ワンマン'}
                                                <button onClick={() => toggleType(t)}><X size={10} /></button>
                                            </span>
                                        ))}
                                        {selectedSongName && (
                                            <span className="filter-chip filter-chip-song">
                                                ♫ {selectedSongName}
                                                <button onClick={() => handleFilterChange({ ...filters, songIds: [] })}><X size={10} /></button>
                                            </span>
                                        )}
                                    </div>
                                )}

                                <h2 className="fade-in">
                                    {selectedYear || '検索結果'} ({filteredLives.length})
                                </h2>

                                {filteredLives.length === 0 ? (
                                    <div className="no-results fade-in">
                                        <p>条件に一致するライブが見つかりません</p>
                                        <button onClick={clearAllFilters}>フィルターをクリア</button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredLives.map((live, idx) => renderLiveCard(live, idx))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LiveList;
