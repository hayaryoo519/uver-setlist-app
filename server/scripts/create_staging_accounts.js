// 同期後の空のStaging DBにだけ、独立した検証アカウントを準備する。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function main() {
    const output = process.argv[2];
    if (process.argv.length !== 3 || !output || !path.isAbsolute(output)) {
        throw new Error('Specify one absolute credential file path.');
    }
    if (process.env.APP_ENV !== 'staging' || process.env.DB_NAME !== 'uver_setlist_staging'
        || !process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_PORT) {
        throw new Error('Explicit Staging database settings are required.');
    }
    const directory = path.dirname(output);
    const info = fs.lstatSync(directory);
    if (!info.isDirectory() || info.isSymbolicLink() || fs.realpathSync(directory) !== directory
        || (info.mode & 0o777) !== 0o700 || info.uid !== process.getuid()) {
        throw new Error('Use an operator-owned private directory with mode 700.');
    }
    if (directory.startsWith('/app/server/uploads') || directory.startsWith('/app/dist')) {
        throw new Error('Credential files must not be stored in public directories.');
    }
    const pool = new Pool({
        host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        connectionTimeoutMillis: 10000,
    });
    let client;
    let createdFile = false;
    let committed = false;
    let commitAttempted = false;
    try {
        client = await pool.connect();
        const target = await client.query('SELECT current_database() AS name');
        if (target.rows[0].name !== 'uver_setlist_staging') {
            throw new Error('Unexpected database; no changes made.');
        }
        await client.query('BEGIN');
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query('LOCK TABLE users IN EXCLUSIVE MODE');
        const existing = await client.query('SELECT count(*)::integer AS count FROM users');
        if (existing.rows[0].count !== 0) {
            throw new Error('Staging users must be empty; existing accounts are not changed.');
        }
        const accounts = [];
        for (const role of ['admin', 'user']) {
            const suffix = crypto.randomBytes(8).toString('hex');
            const email = `staging-${role}-${suffix}@example.invalid`;
            const password = crypto.randomBytes(24).toString('base64url');
            const hash = await bcrypt.hash(password, 10);
            const result = await client.query(
                `INSERT INTO users (username, email, password, role, is_verified, is_public)
                 VALUES ($1, $2, $3, $4, TRUE, FALSE) RETURNING id`,
                [`staging_${role}`, email, hash, role]
            );
            accounts.push({ id: result.rows[0].id, role, email, password });
        }
        const fd = fs.openSync(output, 'wx', 0o600);
        createdFile = true;
        try {
            fs.writeFileSync(fd, JSON.stringify({ accounts }, null, 2) + '\n');
            fs.fsyncSync(fd);
        } finally {
            fs.closeSync(fd);
        }
        commitAttempted = true;
        await client.query('COMMIT');
        committed = true;
        console.log('Created 2 independent Staging accounts; credentials saved privately.');
    } finally {
        try {
            if (client && !committed) await client.query('ROLLBACK');
        } finally {
            try {
                // COMMITの応答が不明な場合は、成立したアカウントの資格情報を失わない。
                if (!committed && !commitAttempted && createdFile) fs.unlinkSync(output);
            } finally {
                if (client) client.release();
                await pool.end();
            }
        }
    }
}

main().catch(() => {
    // DBエラーにはメール等が含まれる可能性があるため、内容を出力しない。
    console.error('Staging account preparation failed. Check target, empty users and private output directory.');
    process.exitCode = 1;
});
