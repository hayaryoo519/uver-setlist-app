import { detectTags } from './liveText';
import tagRules from '../../server/utils/liveTagRules.json';

/** 外部取得時の候補。保存済み・管理者確認済みの情報とは区別する。 */
export const buildLiveMetadataCandidates = (input: {
    title?: string | null;
    tourName?: string | null;
    description?: string | null;
    countryCode?: string | null;
    sourceId?: string | null;
    sourceUrl?: string | null;
}) => ({
    ruleVersion: tagRules.ruleVersion,
    tags: detectTags(input.title, input.tourName, input.description),
    // 取得元のコードを保持するのみ。ここで海外/国内や確認済み状態を確定しない。
    countryCode: input.countryCode || null,
    sourceId: input.sourceId || null,
    sourceUrl: input.sourceUrl || null,
    status: 'unreviewed' as const,
});

const detectVenueType = (venue: string) => {
    const name = venue.toLowerCase();
    if (/arena|dome|アリーナ|ドーム/.test(name)) return 'ARENA';
    if (/zepp|coast|hatch|pit|ax/.test(name)) return 'LIVEHOUSE';
    if (/hall|kaikan|会館|ホール/.test(name)) return 'HALL';
    return 'ONEMAN';
};

/** 単件/一括追加で同じ送信データを使う。原文の曲・投稿者情報は送らない。 */
export const createSetlistLivePayload = (prepared: ReturnType<typeof prepareSetlistImport>) => {
    const raw = prepared.original;
    return {
        tour_name: prepared.tour.name,
        title: '',
        date: raw.eventDate.split('-').reverse().join('-'),
        venue: raw.venue.name,
        type: prepared.suggestedType,
        special_note: prepared.specialNote,
        metadata_source: {
            type: 'setlistfm',
            original: {
                id: raw.id,
                eventDate: raw.eventDate,
                tour: { name: raw.tour?.name || null },
                info: raw.info || null,
                venue: { name: raw.venue.name, city: { country: { code: raw.venue.city?.country?.code || null } } },
                url: raw.url || null,
            },
        },
    };
};

/**
 * setlist.fmの原文を加工結果から切り離す。
 * 日付から生誕祭、会場や時期からフェス名を捏造しない。
 * 候補の確定は行わず、追加APIへ原文を送ってサーバー側で生成・保存する。
 */
export const prepareSetlistImport = (result: any) => {
    const original = structuredClone(result);
    const tourName = result.tour?.name || '';
    const description = result.info || null;
    const venue = result.venue?.name || '';
    const metadataCandidates = buildLiveMetadataCandidates({
        tourName,
        description,
        countryCode: result.venue?.city?.country?.code,
        sourceId: result.id,
        sourceUrl: result.url,
    });
    return {
        ...result,
        original,
        metadataCandidates,
        // tour/infoは元の文字列のみ利用する。未知の企画もdescriptionを保持する。
        tour: { ...result.tour, name: tourName || description || '' },
        suggestedType: metadataCandidates.tags.includes('festival') ? 'FESTIVAL' : detectVenueType(venue),
        specialNote: description,
    };
};
