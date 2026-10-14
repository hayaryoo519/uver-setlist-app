import React, { useState, useMemo, useEffect } from 'react';
import type { Live } from '../types/api';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, Check, Plus, ArrowRight, Loader, Filter, X, Music } from 'lucide-react';
import { useAttendance } from '../hooks/useAttendance';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import LiveMetadataBadges from '../components/LiveMetadataBadges';
import { MEMBERS, PARTICIPANT_ROLES } from '../types/liveMetadata';
import { useLives } from '../hooks/queries/useLives';
import { useSongs } from '../hooks/queries/useSongs';
import { DISCOGRAPHY } from '../data/discography';
import { getDisplaySubtitle, LIVE_TAG_GROUPS, LIVE_TAGS, matchesLiveTags } from '../utils/liveText';
import type { LiveTag } from '../utils/liveText';
import './LiveListPrototype.css';

const normalizeArtistSearch = (value: string) => value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');

const LiveList = () => {
    const { currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const selectedYear = searchParams.get('year');
    const navigate = useNavigate();

    const restoredFilters = location.state?.filters || {};
    const restoredTags: string[] = Array.isArray(restoredFilters.tags) ? restoredFilters.tags : [];
    const initialFilters = {
        text: '',
        venue: '',
        songIds: [] as number[],
        startDate: '',
        endDate: '',
        countryCode: '',
        memberId: '',
        artistId: '',
        participantRole: '',
        ...restoredFilters,
        // 試作時のフェスタグは既存種別へ移し、廃止タグを残さない。
        types: [...new Set<string>([
            ...(Array.isArray(restoredFilters.types) ? restoredFilters.types : []),
            ...(restoredTags.includes('festival') ? ['FESTIVAL'] : []),
        ])],
        tags: LIVE_TAGS.filter(tag => restoredTags.includes(tag.id)).map(tag => tag.id),
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

    const toggleTag = (tag: LiveTag) => {
        const current: LiveTag[] = filters.tags || [];
        handleFilterChange({ ...filters, tags: current.includes(tag)
            ? current.filter(t => t !== tag) : [...current, tag] });
    };

    const countryOptions = useMemo(() => [...new Set(lives
        .filter(live => live.metadata?.country.status === 'confirmed')
        .map(live => live.metadata?.country.code).filter((code): code is string => !!code))].sort(), [lives]);
    const artistOptions = useMemo(() => {
        const artists = new Map<number, string>();
        lives.forEach(live => {
            if (live.metadata?.participants?.status === 'confirmed') live.metadata.participants.items.forEach(item => artists.set(item.artistId, item.name));
        });
        return [...artists.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [lives]);
    const selectedArtistName = artistOptions.find(artist => String(artist.id) === filters.artistId)?.name;
    const selectedRoleName = PARTICIPANT_ROLES.find(role => role.id === filters.participantRole)?.label;
    const countryLabel = filters.countryCode === 'unconfirmed' ? '開催国未確認' : `開催国：${filters.countryCode}`;
    const selectedMemberName = MEMBERS.find(member => member.id === filters.memberId)?.label;

    const renderTagFilters = () => (
        <div className="semantic-filters">
            <p className="semantic-filter-hint">同じ分類内は「いずれか」、分類間は「すべて」に一致</p>
            {LIVE_TAG_GROUPS.map(group => (
                <fieldset key={group.id} className="semantic-filter-group">
                    <legend>{group.label}</legend>
                    <div className="type-filter-pills">
                        {group.tags.map(tag => (
                            <button key={tag.id} type="button"
                                className={`type-pill type-pill-tag ${filters.tags?.includes(tag.id) ? 'active' : ''}`}
                                aria-pressed={!!filters.tags?.includes(tag.id)}
                                onClick={() => toggleTag(tag.id)}>{tag.label}</button>
                        ))}
                    </div>
                </fieldset>
            ))}
            <label className="semantic-filter-group">開催国
                <select className="song-filter-select" value={filters.countryCode || ''}
                    onChange={event => handleFilterChange({ ...filters, countryCode: event.target.value })}>
                    <option value="">すべての開催国</option>
                    <option value="unconfirmed">開催国未確認</option>
                    {countryOptions.map(code => <option key={code} value={code}>{code}</option>)}
                </select>
            </label>
            <label className="semantic-filter-group">生誕祭の対象メンバー
                <select className="song-filter-select" value={filters.memberId || ''}
                    onChange={event => handleFilterChange({ ...filters, memberId: event.target.value })}>
                    <option value="">すべての対象メンバー</option>
                    {MEMBERS.map(member => <option key={member.id} value={member.id}>{member.label}</option>)}
                </select>
            </label>
            <label className="semantic-filter-group">共演アーティスト
                <select className="song-filter-select" value={filters.artistId || ''}
                    onChange={event => handleFilterChange({ ...filters, artistId: event.target.value })}>
                    <option value="">すべての共演アーティスト</option>
                    {artistOptions.map(artist => <option key={artist.id} value={artist.id}>{artist.name}</option>)}
                </select>
            </label>
            <label className="semantic-filter-group">共演の役割
                <select className="song-filter-select" value={filters.participantRole || ''}
                    onChange={event => handleFilterChange({ ...filters, participantRole: event.target.value })}>
                    <option value="">すべての役割</option>
                    {PARTICIPANT_ROLES.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
                </select>
            </label>
        </div>
    );

    const clearAllFilters = () => {
        handleFilterChange({ text: '', venue: '', songIds: [], startDate: '', endDate: '', types: [], tags: [], countryCode: '', memberId: '', artistId: '', participantRole: '' });
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
            if (filters.text.trim()) {
                const q = filters.text.trim().toLowerCase();
                const artistQuery = normalizeArtistSearch(filters.text);
                const venue = typeof live.venue === 'object' ? ((live.venue as any)?.name || '') : (live.venue || '');
                const tour = typeof live.tour_name === 'object' ? ((live.tour_name as any)?.name || '') : (live.tour_name || '');
                if (
                    !tour.toLowerCase().includes(q) &&
                    !(live.title || '').toLowerCase().includes(q) &&
                    !venue.toLowerCase().includes(q) &&
                    !(live.special_note?.toLowerCase() || '').includes(q) &&
                    !(live.metadata?.participants?.status === 'confirmed' && live.metadata.participants.items.some(item =>
                        [item.name, ...item.aliases].some(name => normalizeArtistSearch(name).includes(artistQuery))))
                ) return false;
            }
            if (filters.types?.length > 0 && !filters.types.includes(live.type)) return false;
            if (filters.tags?.length && !matchesLiveTags(live.tags || [], filters.tags)) return false;
            if (filters.countryCode) {
                const code = live.metadata?.country.status === 'confirmed' ? live.metadata.country.code : null;
                if (filters.countryCode === 'unconfirmed' ? !!code : code !== filters.countryCode) return false;
            }
            if (filters.memberId && (live.metadata?.members.status !== 'confirmed' || !live.metadata.members.ids.includes(filters.memberId))) return false;
            if ((filters.artistId || filters.participantRole) && (live.metadata?.participants?.status !== 'confirmed' ||
                !live.metadata.participants.items.some(item => (!filters.artistId || String(item.artistId) === filters.artistId) &&
                    (!filters.participantRole || item.role === filters.participantRole)))) return false;
            return true;
        });
    }, [lives, filters.text, filters.types, filters.tags, filters.countryCode, filters.memberId, filters.artistId, filters.participantRole, selectedYear]);

    // フィルターなし全期間 → 年別グループ表示
    const showGroupedView = !selectedYear && !filters.text && !filters.types?.length && !filters.tags?.length && !filters.songIds?.length && !filters.countryCode && !filters.memberId && !filters.artistId && !filters.participantRole;

    const activeFilterCount = (filters.types?.length || 0) + (filters.tags?.length || 0) + (filters.songIds?.length || 0) + (filters.countryCode ? 1 : 0) + (filters.memberId ? 1 : 0) + (filters.artistId ? 1 : 0) + (filters.participantRole ? 1 : 0);

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

    const renderLiveCard = (live: Live, idx: number) => {
        const tourName = typeof live.tour_name === 'object' ? (live.tour_name as any)?.name : (live.tour_name || '');
        const subtitle = getDisplaySubtitle(tourName, live.title);

        return (
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
                        {tourName}
                        {subtitle && <span className="card-subtitle">{subtitle}</span>}
                    </span>
                    {live.setlist_status === 'UNKNOWN_SETLIST' && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', whiteSpace: 'nowrap', marginLeft: '6px', verticalAlign: 'middle' }}>
                            未登録
                        </span>
                    )}
                </h3>
                <LiveMetadataBadges tags={live.tags} metadata={live.metadata} />
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
                    {tourName}
                    {subtitle && <span className="card-subtitle">{subtitle}</span>}
                    {live.setlist_status === 'UNKNOWN_SETLIST' && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', whiteSpace: 'nowrap', marginLeft: '6px', verticalAlign: 'middle' }}>
                            未登録
                        </span>
                    )}
                </h3>
                <LiveMetadataBadges tags={live.tags} metadata={live.metadata} />
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
};

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
                                        placeholder="ツアー名・会場・共演者で検索"
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
                                    <Music size={14} className="song-filter-icon" aria-hidden="true" />
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
                            <div className="desktop-only">{renderTagFilters()}</div>
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
                                aria-label="絞り込みフィルター"
                                aria-expanded={isFilterOpen}
                                onClick={() => setIsFilterOpen(v => !v)}
                            >
                                <Filter size={14} />
                                {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
                            </button>
                        </div>

                        {/* モバイル絞込パネル */}
                        {isFilterOpen && (
                            <div className="mobile-filter-panel mobile-only">
                                {renderTagFilters()}
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
                                    <Music size={14} className="song-filter-icon" aria-hidden="true" />
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
                                        {LIVE_TAGS.filter(tag => filters.tags?.includes(tag.id)).map(tag => (
                                            <span key={tag.id} className="filter-chip filter-chip-tag">
                                                {tag.label}
                                                <button aria-label={`${tag.label}フィルターを解除`} onClick={() => toggleTag(tag.id)}><X size={10} /></button>
                                            </span>
                                        ))}
                                        {filters.countryCode && (
                                            <span className="filter-chip filter-chip-tag">{countryLabel}
                                                <button aria-label="開催国フィルターを解除" onClick={() => handleFilterChange({ ...filters, countryCode: '' })}><X size={10} /></button>
                                            </span>
                                        )}
                                        {filters.memberId && (
                                            <span className="filter-chip filter-chip-tag">生誕祭：{selectedMemberName || filters.memberId}
                                                <button aria-label="対象メンバーフィルターを解除" onClick={() => handleFilterChange({ ...filters, memberId: '' })}><X size={10} /></button>
                                            </span>
                                        )}
                                        {filters.artistId && (
                                            <span className="filter-chip filter-chip-tag">共演：{selectedArtistName || filters.artistId}
                                                <button aria-label="共演アーティストフィルターを解除" onClick={() => handleFilterChange({ ...filters, artistId: '' })}><X size={10} /></button>
                                            </span>
                                        )}
                                        {filters.participantRole && (
                                            <span className="filter-chip filter-chip-tag">{selectedRoleName || filters.participantRole}
                                                <button aria-label="共演役割フィルターを解除" onClick={() => handleFilterChange({ ...filters, participantRole: '' })}><X size={10} /></button>
                                            </span>
                                        )}
                                        {selectedSongName && (
                                            <span className="filter-chip filter-chip-song">
                                                <Music size={10} aria-hidden="true" /> {selectedSongName}
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
