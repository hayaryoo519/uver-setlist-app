jest.mock('../../db', () => ({ query: jest.fn() }));
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const app = express();
app.use(express.json());
app.use('/users', require('../../routes/users'));

describe('self-deletion and administrator deletion routing', () => {
    const originalSecret = process.env.JWT_SECRET;
    const key = 'isolated-user-deletion-test-key';
    const token = role => jwt.sign({ user_id: 1, role }, key);
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = key;
        for (const method of ['log', 'warn', 'error']) jest.spyOn(console, method).mockImplementation(() => {});
        db.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1 }] });
    });
    afterEach(() => {
        jest.restoreAllMocks();
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    });
    it.each(['user', 'admin'])('allows %s to delete only their own account via /me', async role => {
        const res = await request(app).delete('/users/me').set('token', token(role)).send({ user_id: 2 });
        expect(res.status).toBe(200);
        expect(res.body).toBe('Account deleted successfully');
        expect(db.query).toHaveBeenCalledWith(
            'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [1]
        );
        expect(db.query.mock.calls.length).toBe(1);
    });
    it.each(['', 'invalid-token'])('rejects missing or invalid authentication before DB access (%s)', async value => {
        const res = await request(app).delete('/users/me').set('token', value);
        expect(res.status).toBe(403);
        expect(db.query.mock.calls.length).toBe(0);
    });
    it('returns 404 when the own account is missing or already deleted', async () => {
        db.query.mockResolvedValue({ rowCount: 0, rows: [] });
        const res = await request(app).delete('/users/me').set('token', token('user'));
        expect(res.status).toBe(404);
        expect(res.body).toBe('User not found');
    });
    it('hides database failure details', async () => {
        const marker = 'private-delete-email@example.invalid';
        db.query.mockRejectedValue(new Error(marker));
        const res = await request(app).delete('/users/me').set('token', token('user'));
        expect(res.status).toBe(500);
        expect(res.text).toBe('Server Error');
        expect(JSON.stringify(console.error.mock.calls)).not.toContain(marker);
        expect(console.error).toHaveBeenCalledWith('[users] Account deletion failed');
    });
    it('rejects ordinary users deleting another account', async () => {
        const res = await request(app).delete('/users/2').set('token', token('user'));
        expect(res.status).toBe(403);
        expect(db.query.mock.calls.length).toBe(0);
    });
    it('preserves administrator deletion of another account', async () => {
        const res = await request(app).delete('/users/2').set('token', token('admin'));
        expect(res.status).toBe(200);
        expect(res.body).toBe('User deleted');
        expect(db.query.mock.calls[0][1]).toEqual(['2']);
    });
    it('keeps the administrator own-ID deletion guard', async () => {
        const res = await request(app).delete('/users/1').set('token', token('admin'));
        expect(res.status).toBe(400);
        expect(db.query.mock.calls.length).toBe(0);
    });
});
