import type { LiveTag } from '../utils/liveText';
import { LIVE_TAGS } from '../utils/liveText';
import { MEMBERS, PARTICIPANT_ROLES } from '../types/liveMetadata';
import type { PublicLiveMetadata } from '../types/liveMetadata';
import './LiveMetadataBadges.css';

function countryName(code: string) {
    try { return new Intl.DisplayNames(['ja'], { type: 'region' }).of(code) || code; }
    catch { return code; }
}

/** 公開用の有効情報のみ表示。候補・管理メモ・原文は受け取らない。 */
export default function LiveMetadataBadges({ tags = [], metadata }: {
    tags?: readonly LiveTag[]; metadata?: PublicLiveMetadata;
}) {
    const code = metadata?.country.status === 'confirmed' ? metadata.country.code : null;
    const members = metadata?.members.status === 'confirmed' ? metadata.members.ids : [];
    const participants = metadata?.participants?.status === 'confirmed' ? metadata.participants.items : [];
    const hasOpponent = participants.some(item => item.role === 'co_headliner');
    // 詳しい確定情報があれば同じ意味の汎用タグを重ねない。保存値/検索条件は変更しない。
    const labels: string[] = LIVE_TAGS.filter(tag => tags.includes(tag.id)
        && !(tag.id === 'birthday' && members.length)
        && !(tag.id === 'vs' && hasOpponent)
        && !(tag.id === 'overseas' && code)).map(tag => tag.label);
    // 国内公演は通常状態なので表示せず、海外だけ補足する。
    if (code && code !== 'JP') labels.push(`海外公演：${countryName(code)}`);
    if (members.length) labels.push(`生誕祭：${members.map(id => MEMBERS.find(member => member.id === id)?.label || id).join('・')}`);
    participants.forEach(item => labels.push(`${PARTICIPANT_ROLES.find(role => role.id === item.role)?.label || item.role}：${item.name}`));
    if (!labels.length) return null;
    return <ul className="live-metadata-notes" role="list" aria-label="公演属性">
        {labels.map(label => <li key={label}>{label}</li>)}
    </ul>;
}
