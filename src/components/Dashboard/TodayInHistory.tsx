import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Cake, ChevronDown, ChevronUp, MapPin, Music, PartyPopper, Share2 } from 'lucide-react';
import { useTodayInHistory } from '../../hooks/queries/useTodayInHistory';
import type { TodayInHistoryAnniversary, TodayInHistoryData, TodayInHistoryLive } from '../../types/api';

const SITE_URL = 'https://uver-setlist-archive.org';
const INITIAL_COUNT = 2;

const formatMonthDay = (date: string) => {
    const [, month, day] = date.split('-');
    return `${Number(month)}月${Number(day)}日`;
};

const formatOffset = (offset: number) => {
    if (offset === 1) return '明日';
    if (offset === -1) return '昨日';
    return offset > 0 ? `${offset}日後` : `${-offset}日前`;
};

const liveName = (live: TodayInHistoryLive) => live.tour_name || live.title || 'LIVE';

// X 投稿画面へ本文を渡すだけで、自動投稿はしない
const shareUrl = (live: TodayInHistoryLive, data: TodayInHistoryData) => {
    const when = data.offset_days ? `${formatMonthDay(data.matched_date ?? data.date)}は` : '今日は';
    const text = `${when}${live.date.replace(/-/g, '/')}の「${liveName(live)}」から${live.years_ago}年！\n#UVERworld #今日のUVER史`;
    const params = new URLSearchParams({ text, url: `${SITE_URL}/live/${live.id}` });
    return `https://x.com/intent/post?${params.toString()}`;
};

const anniversaryText = (item: TodayInHistoryAnniversary) =>
    item.years ? `${item.label}（${item.year}年から${item.years}年）` : item.label;

const LiveCard = ({ live, data }: { live: TodayInHistoryLive; data: TodayInHistoryData }) => (
    <li
        style={{
            background: 'var(--card-bg)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px',
            border: live.is_milestone ? '1px solid rgba(251, 191, 36, 0.6)' : '1px solid rgba(255,255,255,0.1)',
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>
            {live.is_milestone && (
                <span style={{ background: '#fbbf24', color: '#000', borderRadius: '4px', padding: '2px 8px' }}>{live.years_ago}周年</span>
            )}
            <span style={{ color: '#fbbf24' }}>{live.years_ago}年前 · {live.date.replace(/-/g, '.')}</span>
        </div>
        <Link to={`/live/${live.id}`} style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', lineHeight: 1.4, textDecoration: 'none' }}>
            {liveName(live)}
        </Link>
        {live.venue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                <MapPin size={14} aria-hidden="true" />
                {live.venue}{live.prefecture ? `（${live.prefecture}）` : ''}
            </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Music size={14} aria-hidden="true" />
                {live.song_count > 0 ? `${live.song_count}曲` : 'セトリ未登録'}
            </span>
            <a
                href={shareUrl(live, data)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${liveName(live)}をXでシェア`}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}
            >
                <Share2 size={14} aria-hidden="true" />
                シェア
            </a>
        </div>
    </li>
);

export const TodayInHistoryContent = ({ data }: { data: TodayInHistoryData }) => {
    const [expanded, setExpanded] = useState(false);
    const { lives, anniversaries } = data;
    const visibleLives = expanded ? lives : lives.slice(0, INITIAL_COUNT);
    const hiddenCount = lives.length - INITIAL_COUNT;

    return (
        <section aria-labelledby="today-in-history-title" style={{ marginBottom: '50px' }}>
            <h2 id="today-in-history-title" className="section-title" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarClock size={20} color="var(--primary-color)" />
                TODAY IN UVER HISTORY
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'normal' }}>{formatMonthDay(data.date)}</span>
            </h2>

            {anniversaries.length > 0 && (
                <ul aria-label="今日の記念日" style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {anniversaries.map(item => (
                        <li
                            key={item.label}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px',
                                background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.5)', color: '#fbbf24', fontWeight: 'bold',
                            }}
                            title={item.description}
                        >
                            {item.type === 'birthday' ? <Cake size={16} aria-hidden="true" /> : <PartyPopper size={16} aria-hidden="true" />}
                            {anniversaryText(item)}
                        </li>
                    ))}
                </ul>
            )}

            {lives.length === 0 || !data.matched_date ? (
                <p style={{ color: '#94a3b8' }}>過去の{formatMonthDay(data.date)}前後に開催されたライブの記録はありません。</p>
            ) : (
                <>
                    {data.offset_days !== 0 && data.offset_days !== null && (
                        <p style={{ color: '#94a3b8', marginBottom: '12px' }}>
                            今日開催された記録はありません。近い日のUVER史：{formatMonthDay(data.matched_date)}（{formatOffset(data.offset_days)}）
                        </p>
                    )}
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '16px' }}>
                        {visibleLives.map(live => <LiveCard key={live.id} live={live} data={data} />)}
                    </ul>
                    {hiddenCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setExpanded(value => !value)}
                            aria-expanded={expanded}
                            style={{
                                marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: 'none',
                                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#cbd5e1', padding: '8px 16px', cursor: 'pointer',
                            }}
                        >
                            {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                            {expanded ? '閉じる' : `もっと見る（残り${hiddenCount}件）`}
                        </button>
                    )}
                </>
            )}
        </section>
    );
};

export const TodayInHistory = () => {
    const { data } = useTodayInHistory();
    // 取得前・失敗時はダッシュボード全体を妨げないよう何も表示しない
    if (!data) return null;
    return <TodayInHistoryContent data={data} />;
};
