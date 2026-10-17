import type { LiveTag } from '../utils/liveText';
import { LIVE_TAGS } from '../utils/liveText';
import { MEMBERS, PARTICIPANT_ROLES } from '../types/liveMetadata';
import type { PublicLiveMetadata } from '../types/liveMetadata';

/** 公開用の有効情報のみ表示。候補・管理メモ・原文は受け取らない。 */
export default function LiveMetadataBadges({ tags = [], metadata }: {
    tags?: readonly LiveTag[]; metadata?: PublicLiveMetadata;
}) {
    const labels: string[] = LIVE_TAGS.filter(tag => tags.includes(tag.id)).map(tag => tag.label);
    if (metadata?.country.status === 'confirmed' && metadata.country.code) labels.push(`開催国：${metadata.country.code}`);
    if (metadata?.members.status === 'confirmed' && metadata.members.ids.length) {
        labels.push(`生誕祭：${metadata.members.ids.map(id => MEMBERS.find(member => member.id === id)?.label || id).join('・')}`);
    }
    if (metadata?.participants?.status === 'confirmed') {
        metadata.participants.items.forEach(item => labels.push(`${PARTICIPANT_ROLES.find(role => role.id === item.role)?.label || item.role}：${item.name}`));
    }
    if (!labels.length) return null;
    return <div className="flex flex-wrap gap-2 mt-2" aria-label="公演属性">
        {labels.map(label => <span key={label} className="text-xs px-2 py-1 rounded border border-sky-500/30 text-sky-200 bg-sky-500/10">{label}</span>)}
    </div>;
}
