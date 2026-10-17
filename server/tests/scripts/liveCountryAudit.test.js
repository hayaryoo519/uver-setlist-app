const fs = require('node:fs');
const path = require('node:path');
const { verifyCountryAudit } = require('../../scripts/verify-live-country-audit');

const sql = fs.readFileSync(path.resolve(__dirname, '../../../scripts/audit/live-country-coverage.sql'), 'utf8');

describe('read-only country coverage audit', () => {
    test('uses a bounded read-only transaction and rolls back rather than committing', () => {
        const statements = sql.replace(/--[^\n]*/g, '');
        expect(statements.trim()).toMatch(/^BEGIN READ ONLY;/);
        expect(statements.trim()).toMatch(/ROLLBACK;$/);
        expect(statements).toContain("SET LOCAL statement_timeout = '15s'");
        expect(statements).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP|COPY|CALL|COMMIT)\b/i);
    });

    test('restricts database names and emits counts, not candidate values or identifiers', () => {
        expect(sql).toContain("current_database() <> 'uver_setlist_staging'");
        expect(sql).toContain("'^country_audit_fixture_[a-z0-9]+$'");
        const projection = sql.slice(sql.lastIndexOf('\nSELECT cohort'));
        expect(projection).toContain('COUNT(*)');
        expect(projection).not.toMatch(/\b(?:candidates|overrides|raw_code|setlistfm_id|external_source_id|live_id|original)\b/);
        expect(sql).not.toContain("->'original'");
    });

    test.each([
        { host: 'db.example.invalid', port: 12345 },
        { host: '127.0.0.1', port: 5432 },
        { host: '127.0.0.1', port: 54325 },
        { host: '127.0.0.1', port: 54332 },
    ])('fixture helper refuses application/non-loopback connections without a query (%j)', async connection => {
        const pool = { query: jest.fn() };
        await expect(verifyCountryAudit({ connection, pool, dataDirectory: path.resolve('fixture-only') }))
            .rejects.toThrow('Require an owned loopback fixture');
        expect(pool.query).not.toHaveBeenCalled();
    });

    test('fixture helper refuses a different data_directory before creating anything', async () => {
        const pool = { query: jest.fn().mockResolvedValue({ rows: [{ directory: path.resolve('not-owned') }] }) };
        await expect(verifyCountryAudit({ connection: { host: '127.0.0.1', port: 12345 }, pool,
            dataDirectory: path.resolve('fixture-only') })).rejects.toThrow('Refuse a database not owned by the fixture');
        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(pool.query.mock.calls[0][0]).toContain("current_setting('data_directory')");
    });
});
