jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('pg', () => ({ Pool: jest.fn() }));

const { Pool } = require('pg');

describe('migration advisory lock', () => {
    it('fails the process without applying schema when another runner owns the lock', async () => {
        const client = {
            query: jest.fn(async sql => sql.includes('pg_try_advisory_lock')
                ? { rows: [{ locked: false }] }
                : { rows: [{ pg_advisory_unlock: false }] }),
            release: jest.fn(),
        };
        const end = jest.fn(async () => {});
        Pool.mockImplementation(() => ({ connect: async () => client, end }));
        const { runMigrations } = require('../../scripts/migrate');
        const previousExitCode = process.exitCode;
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            process.exitCode = 0;
            await runMigrations();
            expect(process.exitCode).toBe(1);
            expect(client.query.mock.calls.map(([sql]) => sql)).toEqual([
                'SELECT pg_try_advisory_lock($1) AS locked',
                'SELECT pg_advisory_unlock($1)',
            ]);
            expect(client.release).toHaveBeenCalledTimes(1);
            expect(end).toHaveBeenCalledTimes(1);
        } finally {
            process.exitCode = previousExitCode;
            log.mockRestore();
        }
    });
});
