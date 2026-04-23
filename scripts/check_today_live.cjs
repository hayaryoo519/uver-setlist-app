const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

async function check() {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect();
    // 今日のライブを確認
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    console.log(`Checking lives for: ${today}`);
    
    const res = await client.query("SELECT id, tour_name, venue, date FROM lives WHERE date = $1", [today]);
    console.log('Result for today:');
    console.log(JSON.stringify(res.rows, null, 2));

    // 全ての直近のライブを確認
    const allRes = await client.query("SELECT id, tour_name, venue, date FROM lives WHERE date >= '2026-04-01' ORDER BY date DESC LIMIT 5");
    console.log('\nRecent lives:');
    console.log(JSON.stringify(allRes.rows, null, 2));

  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await client.end();
  }
}
check();
