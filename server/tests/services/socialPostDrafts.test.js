jest.mock('../../db');

const db = require('../../db');
const { createOnThisDayDraft, jstDateParts } = require('../../services/socialPostDrafts');

describe('socialPostDrafts', () => {
    beforeEach(() => jest.clearAllMocks());

    it('JSTの日付を使うこと', () => {
        expect(jstDateParts(new Date('2026-09-25T15:30:00Z'))).toEqual({ date: '2026-09-26', monthDay: '09-26' });
    });

    it('過去の同日ライブから承認待ち下書きを作ること', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ id: 10, date: '2020-09-26', venue: '日本武道館' }] })
            .mockResolvedValueOnce({ rows: [{ title: 'CORE PRIDE' }] })
            .mockResolvedValueOnce({ rows: [{ id: 5, post_type: 'on_this_day', status: 'draft' }] });

        const result = await createOnThisDayDraft({ now: new Date('2026-09-25T15:30:00Z') });

        expect(result.id).toBe(5);
        expect(db.query.mock.calls[0][1]).toEqual(['09-26', '2026-09-26']);
        expect(db.query.mock.calls[2][0]).toContain('ON CONFLICT (idempotency_key) DO NOTHING');
        expect(db.query.mock.calls[2][1][1]).toContain('CORE PRIDE');
    });

    it('対象ライブがない日は何も作らないこと', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });
        await expect(createOnThisDayDraft()).resolves.toBeNull();
        expect(db.query).toHaveBeenCalledTimes(1);
    });
});
