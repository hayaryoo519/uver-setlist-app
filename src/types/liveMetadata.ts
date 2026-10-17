export type MetadataTag = 'mens' | 'womens' | 'birthday' | 'christmas' | 'anniversary' | 'vs';
export type MemberId = 'takuya' | 'katsuya' | 'akira' | 'nobuto' | 'shintaro' | 'seika';
export const METADATA_TAGS: { id: MetadataTag; label: string }[] = [
    { id: 'mens', label: '男祭り' }, { id: 'womens', label: '女祭り' },
    { id: 'birthday', label: '生誕祭' }, { id: 'christmas', label: 'クリスマス' },
    { id: 'anniversary', label: '周年記念' }, { id: 'vs', label: '対バン' },
];
export const MEMBERS: { id: MemberId; label: string }[] = [
    { id: 'takuya', label: 'TAKUYA∞' }, { id: 'katsuya', label: '克哉' },
    { id: 'akira', label: '彰' }, { id: 'nobuto', label: '信人' },
    { id: 'shintaro', label: '真太郎' }, { id: 'seika', label: '誠果' },
];
export interface MetadataReviewSummary {
    liveId: number; revision: number;
    unconfirmedFields: ('country' | 'members' | 'participants')[];
    hasUnconfirmed: boolean;
    countryConflict: 'none' | 'unresolved' | 'confirmed';
    needsClassificationReview: boolean;
}
export type ParticipantRole = 'co_headliner' | 'guest' | 'supporting_act';
export const PARTICIPANT_ROLES: { id: ParticipantRole; label: string }[] = [
    { id: 'co_headliner', label: '対バン相手' }, { id: 'guest', label: 'ゲスト' },
    { id: 'supporting_act', label: 'オープニング・サポート' },
];
export interface LiveArtist { id: number; name: string; aliases: string[]; revision: number }
export interface ParticipantAssignment { artistId: number; role: ParticipantRole }
export interface PublicParticipant extends ParticipantAssignment { name: string; aliases: string[] }
export interface MetadataCandidates {
    tags?: MetadataTag[];
    memberIds?: MemberId[];
    countryCode?: string | null;
    sourceId?: string | null;
    sourceUrl?: string | null;
    ruleVersion?: number;
    original?: Record<string, unknown>;
    sources?: Record<string, MetadataCandidates>;
    conflicts?: { field: string; values: string[] }[];
}
export interface MetadataOverrides {
    tagOverrides?: { add: MetadataTag[]; remove: MetadataTag[] };
    country?: { code: string };
    members?: { ids: MemberId[] };
    participants?: { items: ParticipantAssignment[] };
    classification?: { needsReview: boolean; note: string | null };
}
export type MetadataPatch = { [K in keyof MetadataOverrides]?: MetadataOverrides[K] | null };
export interface PublicLiveMetadata {
    country: { code: string | null; status: 'confirmed' | 'unreviewed' };
    members: { ids: MemberId[]; status: 'confirmed' | 'unreviewed' };
    participants?: { items: PublicParticipant[]; status: 'confirmed' | 'unreviewed' };
}
export interface LiveMetadata {
    live_id: number;
    revision: number;
    candidates: MetadataCandidates;
    overrides: MetadataOverrides;
    artists?: LiveArtist[];
    effective: {
        tags: (MetadataTag | 'overseas')[];
        country: { code: string | null; status: 'confirmed' | 'unreviewed' };
        members: { ids: MemberId[]; status: 'confirmed' | 'unreviewed' };
        participants?: { items: ParticipantAssignment[]; status: 'confirmed' | 'unreviewed' };
        classification: { needsReview: boolean; note: string | null };
    };
}
