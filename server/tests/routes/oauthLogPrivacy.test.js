jest.mock('../../db');
jest.mock('axios');
jest.mock('../../middleware/authorization', () => ({ authorize: (req, res, next) => {
    req.user = { user_id: 'private-oauth-marker', role: 'user' }; next();
} }));
jest.mock('../../utils/encryption', () => ({
    encrypt: jest.fn(value => `encrypted:${value}`), decrypt: jest.fn(() => 'fake-refresh-token'),
    signState: jest.fn(() => 'fake-state'), verifyState: jest.fn(() => 'private-oauth-marker')
}));
const mockGetToken = jest.fn();
jest.mock('googleapis', () => ({ google: { auth: { OAuth2: jest.fn(() => ({ getToken: mockGetToken })) } } }));
jest.mock('../../services/youtubeService');
const express = require('express');
const request = require('supertest');
const db = require('../../db');
const axios = require('axios');
const YoutubeService = require('../../services/youtubeService');
const SpotifyService = require('../../services/spotifyService');
const app = express();
app.use(express.json());
app.use('/spotify', require('../../routes/spotify'));
app.use('/youtube', require('../../routes/youtube'));

describe('OAuth error log privacy', () => {
    const marker = 'private-oauth-marker';
    let error, warn;
    const failure = Object.assign(new Error(marker), {
        response: { data: { access_token: marker, refresh_token: marker, error_description: marker } },
        config: { headers: { Authorization: marker }, data: marker }
    });
    beforeEach(() => {
        jest.clearAllMocks();
        error = jest.spyOn(console, 'error').mockImplementation(() => {});
        warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());
    function expectPrivateLogs() {
        expect(JSON.stringify([error.mock.calls, warn.mock.calls])).not.toContain(marker);
    }
    it.each(['spotify', 'youtube'])('does not log %s token exchange errors or response payloads', async platform => {
        axios.post.mockRejectedValue(failure);
        mockGetToken.mockRejectedValue(failure);
        const res = await request(app).get(`/${platform}/callback`).query({ code: marker, state: marker });
        expect(res.status).toBe(500);
        expect(res.text).not.toContain(marker);
        expect(error).toHaveBeenCalled();
        expectPrivateLogs();
    });
    it('preserves Spotify refresh failure cleanup and relink error without logging secrets', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ access_token: marker, refresh_token_encrypted: marker, expires_at: new Date(0) }] })
            .mockResolvedValueOnce({ rowCount: 1 });
        axios.post.mockRejectedValue(failure);
        await expect(new SpotifyService(marker).getAccessToken()).rejects.toThrow('Spotify session expired. Please re-link your account.');
        expect(db.query).toHaveBeenCalledWith('DELETE FROM user_spotify_tokens WHERE user_id = $1', [marker]);
        expect(error).toHaveBeenCalledWith('[Spotify] Token refresh failed');
        expectPrivateLogs();
    });
    it('preserves YouTube revoked-token 401 and cleanup without logging API details', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ title: marker }] }).mockResolvedValueOnce({ rowCount: 1 });
        YoutubeService.mockImplementation(() => ({ searchTrack: jest.fn().mockRejectedValue(
            Object.assign(new Error(marker), { response: { data: { error: 'invalid_grant', error_description: marker } } })
        ) }));
        const res = await request(app).post('/youtube/auto-map-song').send({ songId: 1 });
        expect(res.status).toBe(401);
        expect(res.body.relinkRequired).toBe(true);
        expect(db.query).toHaveBeenCalledWith('DELETE FROM user_google_tokens WHERE user_id = $1', [marker]);
        expectPrivateLogs();
    });
    it('keeps YouTube batch failure counts without logging song IDs or search errors', async () => {
        db.query.mockResolvedValue({ rows: [{ title: marker, yt_video_id: null }] });
        YoutubeService.mockImplementation(() => ({ searchTrack: jest.fn().mockRejectedValue(failure) }));
        const res = await request(app).post('/youtube/auto-map-batch').send({ songIds: [marker] });
        expect(res.status).toBe(200);
        expect(res.body.results).toEqual({ success: 0, failed: 1, skipped: 0 });
        expect(error).toHaveBeenCalledWith('[YouTube Bulk] Track mapping failed');
        expectPrivateLogs();
    });
});
