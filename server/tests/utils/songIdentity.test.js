const { songIdentity, registrationTitle, resolveSong, findSong } = require('../../utils/songIdentity');

const rosier = { id: 381, title: 'ROSIER （LUNA SEA Cover）' };
const duplicate = { id: 462, title: 'ROSIER (LUNA SEA cover)' };
function clientFor(rows) {
    return { query: jest.fn(async (sql, args) => {
        if (sql.startsWith('SELECT *')) return { rows };
        if (sql.startsWith('INSERT')) return { rows: [{ id: 500, title: args[0] }] };
        return { rows: [] };
    }) };
}

describe('conservative song registration identity', () => {
    test.each(['ROSIER (LUNA SEA cover)', ' rosier　（ LUNA   SEA COVER ） ', 'ROSIER(LUNA SEA Cover)'])('reviewed alias: %s', title => {
        expect(songIdentity(title)).toBe(songIdentity(rosier.title));
    });
    test.each(['ROSIER', 'ROSIER (Other Artist cover)', 'ROSIER (LUNA SEAカバーw/RYUICHIさん)', 'ROSIER (LUNA SEA cover acoustic)', 'ROSIER (LUNA SEA cover) feat. Guest'])('does not merge: %s', title => {
        expect(songIdentity(title)).not.toBe(songIdentity(rosier.title));
    });
    test('unreviewed names and punctuation are not globally folded', () => {
        expect(songIdentity('Song A')).not.toBe(songIdentity('SongA'));
        expect(songIdentity('ABC')).not.toBe(songIdentity('abc'));
    });
    test('preserves version annotations even when legacy dictionary drops them', () => {
        expect(registrationTitle('Kimi no Suki na Uta (Acoustic Version)')).toBe('Kimi no Suki na Uta (Acoustic Version)');
        expect(registrationTitle('Gekidou')).toBe('激動');
    });
    test.each([null, {}, '', ' ', 'x'.repeat(256)])('invalid input %#', title => {
        expect(() => registrationTitle(title)).toThrow('Invalid song title');
    });
    test('reuses a single active reviewed spelling without updating references', async () => {
        const client = clientFor([rosier]);
        expect(await resolveSong(client, 'rosier (LUNA SEA COVER)')).toEqual({ song: rosier, created: false });
        expect(client.query.mock.calls[0][0]).toContain('pg_advisory_xact_lock');
        expect(client.query.mock.calls.some(([sql]) => /INSERT|UPDATE|DELETE/.test(sql))).toBe(false);
    });
    test('keeps exact existing IDs; never guesses between legacy duplicates', async () => {
        const client = clientFor([rosier, duplicate]);
        expect(await findSong(client, duplicate.title)).toBe(duplicate);
        await expect(resolveSong(client, 'rosier (luna sea cover)')).rejects.toMatchObject({ songIdentityStatus: 409 });
    });
    test('does not reuse or implicitly restore deleted rows', async () => {
        await expect(resolveSong(clientFor([{ ...rosier, deleted_at: '2020-01-01' }]), duplicate.title)).rejects.toMatchObject({ songIdentityStatus: 409 });
    });
    test.each(['fixture song', 'FixtureSong', 'Fixture　Song'])('legacy spelling candidate %s requires review rather than creating a duplicate', async title => {
        await expect(resolveSong(clientFor([{ id: 1, title: 'Fixture Song' }]), title)).rejects.toMatchObject({ songIdentityStatus: 409 });
    });
    test.each(['= (Equal)', 'THE ONE (SE)', 'Gekidou (Awakening)', 'Kimi no Suki na Uta (Acoustic Version)'])('dictionary annotation %s never creates a duplicate of an existing translated title', async title => {
        const { normalizeSongTitle } = require('../../utils/songTranslations');
        await expect(resolveSong(clientFor([{ id: 1, title: normalizeSongTitle(title) }]), title, true)).rejects.toMatchObject({ songIdentityStatus: 409 });
    });
    test.each([['Shamrock', 'SHAMROCK'], ['Gold', 'GOLD'], ['Core Pride', 'CORE PRIDE'], ['Gekidou', '激動']])('trusted plain translation %s reuses %s', async (title, canonical) => {
        expect((await resolveSong(clientFor([{ id: 1, title: canonical }]), title, true)).song.id).toBe(1);
    });
    test('new songs retain all guest information', async () => {
        const client = clientFor([rosier]);
        const title = 'ROSIER (LUNA SEAカバーw/RYUICHIさん)';
        expect((await resolveSong(client, title)).song.title).toBe(title);
        expect(client.query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO songs'), [title, title.toLowerCase()]);
    });
});
