const request = require('supertest');
const express = require('express');
jest.mock('../../db', () => ({ pool: { connect: jest.fn() }, query: jest.fn() }));
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, res, next) => next(), adminCheck: (req, res, next) => next(),
    optionalAuth: (req, res, next) => next(),
}));
const db = require('../../db');
const app = express();
app.use(express.json());
app.use('/songs', require('../../routes/songs'));
app.use('/lives', require('../../routes/lives'));
const original = { id: 381, title: 'ROSIER （LUNA SEA Cover）', author: 'LUNA SEA' };
let client;
beforeEach(() => {
    jest.clearAllMocks();
    client = { release: jest.fn(), query: jest.fn(async sql => {
        if (sql === 'SELECT * FROM songs ORDER BY id') return { rows: [original] };
        if (sql === 'SELECT title FROM songs WHERE id = $1') return { rows: [{ title: 'Other song' }] };
        return { rows: [], rowCount: 0 };
    }) };
    db.pool.connect.mockResolvedValue(client);
});
test('manual alias registration returns 409, never overwrites artist/IDs', async () => {
    const res = await request(app).post('/songs').send({ title: 'rosier (LUNA SEA COVER)', spotify_track_id: 'different' });
    expect(res.status).toBe(409);
    expect(client.query.mock.calls.some(([sql]) => /INSERT|UPDATE/.test(sql))).toBe(false);
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
});
test('conflicting author on exact title is not overwritten', async () => {
    const res = await request(app).post('/songs').send({ title: original.title, author: 'Other Artist' });
    expect(res.status).toBe(409);
});
test('renaming into an existing identity rolls back', async () => {
    const res = await request(app).put('/songs/500').send({ title: 'rosier (LUNA SEA cover)' });
    expect(res.status).toBe(409);
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
});
test('restoring a conflicting identity rolls back', async () => {
    client.query.mockImplementation(async sql => ({ rows: sql.includes('SELECT title') ? [{ title: 'rosier (LUNA SEA cover)' }] : sql.includes('SELECT *') ? [original] : [] }));
    expect((await request(app).patch('/songs/500/restore')).status).toBe(409);
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
});
test('single import uses the same transaction client and existing song', async () => {
    const res = await request(app).post('/lives/12/import-setlist').send({ songs: [{ title: 'rosier (LUNA SEA COVER)', order: 1 }] });
    expect(res.status).toBe(200);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO setlists'), [ '12', 381, 1 ]);
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(db.query).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledTimes(1);
});
test('ambiguous single import rolls back deletion instead of partially replacing setlist', async () => {
    client.query.mockImplementation(async sql => ({ rows: sql.includes('SELECT *') ? [original, { id: 462, title: 'ROSIER (LUNA SEA cover)' }] : [] }));
    expect((await request(app).post('/lives/12/import-setlist').send({ songs: [{ title: 'rosier (LUNA SEA COVER)' }] })).status).toBe(409);
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO setlists'))).toBe(false);
});
