// 所有する使い捨てクラスタ内だけで、集計SQLの分類・非変更・環境拒否を検証する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { Pool } = require('pg');

async function verifyCountryAudit({ root, pool, connection, dataDirectory, passed }) {
    assert(process.env.APP_ENV !== 'production', 'Country audit fixture is local-only');
    assert(connection?.host === '127.0.0.1' && Number.isInteger(connection.port)
        && ![5432, 54325, 54332].includes(connection.port), 'Require an owned loopback fixture');
    assert(dataDirectory && path.isAbsolute(dataDirectory), 'Require an owned fixture data directory');
    const actual = await pool.query("SELECT current_setting('data_directory') AS directory");
    const normalize = value => {
        const resolved = path.resolve(value).replace(/\\/g, '/');
        return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    };
    assert(normalize(actual.rows[0].directory) === normalize(dataDirectory), 'Refuse a database not owned by the fixture');
    const sql = fs.readFileSync(path.join(root, 'scripts/audit/live-country-coverage.sql'), 'utf8');
    const name = `country_audit_fixture_${randomBytes(6).toString('hex')}`;
    let fixture;
    let created = false;
    try {
        await pool.query(`CREATE DATABASE "${name}"`);
        created = true;
        fixture = new Pool({ ...connection, database: name, max: 1 });
        const fixtureDirectory = await fixture.query("SELECT current_setting('data_directory') AS directory");
        assert(normalize(fixtureDirectory.rows[0].directory) === normalize(dataDirectory), 'Refuse a fixture connection to another cluster');
        await fixture.query(`CREATE TABLE lives (id INTEGER PRIMARY KEY, date DATE, setlistfm_id TEXT, external_source_id TEXT);
            CREATE TABLE live_metadata (live_id INTEGER PRIMARY KEY REFERENCES lives(id), candidates JSONB NOT NULL, overrides JSONB NOT NULL);`);
        const entries = [
            { candidates: { countryCode: 'KR' }, overrides: { country: { code: 'JP' } } },
            { overrides: { country: { code: 'KR' } } },
            { candidates: { countryCode: 'JP', sources: { fixture: { countryCode: 'JP' } } } },
            { candidates: { sources: { fixture: { countryCode: 'KR' } } } },
            { candidates: { countryCode: 'JP', sources: { fixture: { countryCode: 'KR' } } } },
            { candidates: { conflicts: [{ field: 'countryCode', values: ['JP', 'KR'] }] } },
            { setlistId: 'fixture-7' },
            { externalId: 'fixture-hash-not-a-source-url' },
            { candidates: { countryCode: 7 } },
            { candidates: { countryCode: 'JP' }, overrides: { country: {} } },
            { candidates: { countryCode: 'JP' }, overrides: { country: null } },
            { setlistId: 'fixture-12', missingMetadata: true },
            { date: '2100-01-01', setlistId: 'fixture-13' },
            { date: '2100-01-01', candidates: { countryCode: 'JP' } },
            { date: null, missingMetadata: true },
            { candidates: { countryCode: 'JP', sources: { fixture: { countryCode: false } } } },
        ];
        for (const [index, entry] of entries.entries()) {
            const id = index + 1;
            await fixture.query('INSERT INTO lives VALUES ($1,$2,$3,$4)', [id,
                Object.hasOwn(entry, 'date') ? entry.date : '2000-01-01', entry.setlistId || null, entry.externalId || null]);
            if (!entry.missingMetadata) {
                await fixture.query('INSERT INTO live_metadata VALUES ($1,$2::jsonb,$3::jsonb)', [id,
                    JSON.stringify({ ...entry.candidates, original: { private: 'PRIVATE_COUNTRY_AUDIT_SENTINEL' } }),
                    JSON.stringify({ ...entry.overrides, classification: { note: 'PRIVATE_COUNTRY_AUDIT_SENTINEL' } })]);
            }
        }
        const snapshot = async () => JSON.stringify((await fixture.query(`SELECT l.*, m.candidates, m.overrides
            FROM lives l LEFT JOIN live_metadata m ON m.live_id=l.id ORDER BY l.id`)).rows);
        const before = await snapshot();
        const results = await fixture.query(sql);
        const report = results.find(result => result.fields?.[0]?.name === 'cohort').rows;
        const past = report.find(row => row.cohort === 'past');
        assert.deepEqual(past, { cohort: 'past', total_lives: 13, confirmed: 2, manual_needs_review: 2,
            single_candidate_unconfirmed: 2, conflicting_unconfirmed: 2, invalid_candidate_unconfirmed: 2,
            missing_candidate_unconfirmed: 3, missing_candidate_with_setlistfm_id: 2,
            missing_candidate_without_setlistfm_id: 1, external_source_id_present: 1 });
        assert.equal(report.find(row => row.cohort === 'today_or_future').total_lives, 2);
        assert.equal(report.find(row => row.cohort === 'undated').total_lives, 1);
        for (const row of report) assert.equal(row.confirmed + row.manual_needs_review + row.single_candidate_unconfirmed
            + row.conflicting_unconfirmed + row.invalid_candidate_unconfirmed + row.missing_candidate_unconfirmed, row.total_lives);
        assert(!JSON.stringify(report).includes('PRIVATE_COUNTRY_AUDIT_SENTINEL'));
        assert(report.every(row => Object.values(row).every(value => typeof value === 'number' || ['past', 'today_or_future', 'undated'].includes(value))));
        assert.equal(await snapshot(), before, 'Read-only report must not change any fixture data');
        const client = await pool.connect();
        try {
            await assert.rejects(client.query(sql), /Refusing country audit outside staging or a fixture database/);
        } finally {
            try { await client.query('ROLLBACK'); }
            finally { client.release(); }
        }
        passed('Read-only country audit: 16 synthetic records, aggregate-only output, unchanged data and non-staging DB refusal');
    } finally {
        if (fixture) await fixture.end();
        if (created) await pool.query(`DROP DATABASE "${name}"`);
    }
}

module.exports = { verifyCountryAudit };
