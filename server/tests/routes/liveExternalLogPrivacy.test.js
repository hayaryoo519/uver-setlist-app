jest.mock('../../db');
jest.mock('axios');
jest.mock('../../middleware/authorization', () => ({
    authorize: (req, res, next) => { req.user = { user_id: 1, role: 'admin' }; next(); },
    adminCheck: (req, res, next) => next()
}));
jest.mock('../../utils/pushNotification', () => ({ notifyNewLive: jest.fn() }));
jest.mock('../../services/scheduleImporter', () => ({ importSchedule: jest.fn() }));
jest.mock('../../services/collectYears', () => ({ collectYears: jest.fn() }));
const express = require('express');
const request = require('supertest');
const axios = require('axios');
const db = require('../../db');
const { notifyNewLive } = require('../../utils/pushNotification');
const { importSchedule } = require('../../services/scheduleImporter');

describe('live and external route log privacy', () => {
    const marker = 'private-input-token@example.invalid';
    const originalApiKey = process.env.SETLIST_FM_API_KEY;
    let app;
    let logs;
    beforeEach(() => {
        jest.clearAllMocks();
        logs = [];
        for (const method of ['log', 'warn', 'error']) {
            jest.spyOn(console, method).mockImplementation((...args) => logs.push(args));
        }
        process.env.SETLIST_FM_API_KEY = marker;
        const failure = Object.assign(new Error(marker), { response: { status: 502, data: { message: marker } } });
        db.query.mockImplementation(async sql => {
            if (sql === 'ROLLBACK') return { rows: [] };
            throw failure;
        });
        axios.get.mockRejectedValue(failure);
        importSchedule.mockRejectedValue(failure);
        notifyNewLive.mockResolvedValue(undefined);
        app = express();
        app.use(express.json());
        app.use('/lives', require('../../routes/lives'));
        app.use('/external', require('../../routes/external_api'));
    });
    afterEach(() => {
        jest.restoreAllMocks();
        if (originalApiKey === undefined) delete process.env.SETLIST_FM_API_KEY;
        else process.env.SETLIST_FM_API_KEY = originalApiKey;
    });
    function expectPrivateLogs() {
        expect(logs.length).toBeGreaterThan(0);
        expect(JSON.stringify(logs)).not.toContain(marker);
        // Every diagnostic is a fixed operation name with no payload argument.
        expect(logs.every(args => args.length === 1 && /^\[(lives|external\/)/.test(args[0]))).toBe(true);
    }
    it.each([
        ['get', '/lives', undefined],
        ['get', '/lives/1', undefined],
        ['post', '/lives', { venue: marker, special_note: marker }],
        ['put', '/lives/1', { venue: marker, special_note: marker }],
        ['put', '/lives/1/setlist', { songs: [1] }],
        ['post', '/lives/1/import-setlist', { songs: [{ title: marker }] }],
        ['post', '/lives/batch-delete', { ids: [1] }],
        ['delete', '/lives/1', undefined]
    ])('hides input and database errors for %s %s', async (method, path, body) => {
        const res = await request(app)[method](path).send(body);
        expect(res.status).toBe(500);
        expectPrivateLogs();
    });
    it.each(['/external/setlistfm/search', '/external/setlistfm/setlist/1'])('hides upstream errors for %s', async path => {
        const res = await request(app).get(path).query({ keyword: marker });
        expect(res.status).toBe(502);
        expect(res.text).not.toContain(marker);
        expectPrivateLogs();
    });
    it('hides schedule import errors', async () => {
        const res = await request(app).post('/external/schedule/import').send({ dryRun: true });
        expect(res.status).toBe(500);
        expectPrivateLogs();
    });
    it('returns external results without logging search inputs or result bodies', async () => {
        const data = { setlist: [{ eventDate: '28-12-2024', info: marker, tour: { name: marker } }] };
        axios.get.mockResolvedValue({ status: 200, data });
        const res = await request(app).get('/external/setlistfm/search').query({ keyword: marker });
        expect(res.body).toEqual(data);
        expect(axios.get.mock.calls[0][1].params.tourName).toBe(marker);
        expectPrivateLogs();
    });
    it('returns updated live data without logging request or returned row', async () => {
        const row = { id: 1, venue: marker, special_note: marker };
        db.query.mockResolvedValue({ rows: [row] });
        const res = await request(app).put('/lives/1').send(row);
        expect(res.status).toBe(200);
        expect(res.body).toEqual(row);
        expect(db.query.mock.calls[0][1]).toContain(marker);
        expectPrivateLogs();
    });
    it('retains not-found behavior without logging the supplied live ID', async () => {
        db.query.mockResolvedValue({ rows: [] });
        const res = await request(app).put(`/lives/${marker}`).send({});
        expect(res.status).toBe(404);
        expectPrivateLogs();
    });
    it('keeps creation and notification error handling without logging venue or error', async () => {
        const row = { id: 1, venue: marker };
        db.query.mockResolvedValue({ rows: [row] });
        notifyNewLive.mockRejectedValue(new Error(marker));
        const res = await request(app).post('/lives').send(row);
        expect(res.status).toBe(200);
        expect(res.body).toEqual(row);
        expect(notifyNewLive).toHaveBeenCalledWith(row);
        expectPrivateLogs();
    });
});
