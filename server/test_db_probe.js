const { Pool } = require('pg');

const CONFIGS = [
    // Likely Local Postgres
    { host: 'localhost', port: 5432, user: 'postgres', password: 'password', database: 'postgres' },
    { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'postgres' },
    { host: 'localhost', port: 5432, user: 'uver_user', password: 'uver_password', database: 'uver_app_db' },

    // Previous config attempt
    { host: 'localhost', port: 5433, user: 'uver_user', password: 'uver_password', database: 'uver_app_db' },

    // Supabase Docker Port
    { host: 'localhost', port: 54332, user: 'postgres', password: 'postgres', database: 'postgres' },
    { host: 'localhost', port: 54332, user: 'postgres', password: 'password', database: 'postgres' },
    { host: 'localhost', port: 54332, user: 'postgres', password: 'your-super-secret-and-long-postgres-password', database: 'postgres' },
];

async function probe() {
    console.log("Starting DB Connection Probe...");

    for (const config of CONFIGS) {
        console.log(`Trying ${config.host}:${config.port} as ${config.user}...`);
        const pool = new Pool({ ...config, connectionTimeoutMillis: 2000 });
        try {
            const res = await pool.query('SELECT version()');
            console.log(`✅ SUCCESS! Connected to ${config.host}:${config.port}`);
            console.log(`   Version: ${res.rows[0].version}`);
            console.log(`   WORKING CONFIG: `, config);
            await pool.end();
            process.exit(0);
        } catch (err) {
            console.log(`   ❌ Failed: ${err.message}`);
        } finally {
            try { await pool.end(); } catch (e) { }
        }
    }
    console.log("All probes completed.");
}

probe();
