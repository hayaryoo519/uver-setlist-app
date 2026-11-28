#!/usr/bin/env node
// Anonymous public GET only. No admin token, source fetch, DB connection, or write operation.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ENDPOINTS = Object.freeze({
  staging: 'http://192.168.0.13:9001/api/lives',
  production: 'https://uver-setlist-archive.org/api/lives',
});
const manifestUrl = new URL('./live-country-evidence.json', import.meta.url);
const key = value => value.trim().normalize('NFKC');
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.entries) || !manifest.sources || Array.isArray(manifest.sources)) {
    throw new Error('Invalid country evidence manifest');
  }
  const seen = new Set();
  for (const row of manifest.entries) {
    if (!Array.isArray(row) || row.length !== 5) throw new Error('Invalid evidence row');
    const [date, tour, venue, code, source] = row;
    if (!validDate(date) || ![tour, venue, source].every(x => typeof x === 'string' && x.trim()) || !['JP', 'KR'].includes(code)) {
      throw new Error('Invalid country evidence value');
    }
    const urls = manifest.sources[source];
    if (!Array.isArray(urls) || !urls.length || urls.some(x => typeof x !== 'string' || !/^https:\/\/(?:www\.)?(?:uverworld\.jp|monsterbash\.jp|hardoff-eco-stadium\.jp)\//.test(x))) {
      throw new Error('Invalid official source URL');
    }
    const identity = JSON.stringify([date, key(tour), key(venue)]);
    if (seen.has(identity)) throw new Error('Duplicate evidence identity');
    seen.add(identity);
  }
  return manifest;
}

export function preview(manifest, lives) {
  validateManifest(manifest);
  if (!Array.isArray(lives)) throw new Error('Public lives response is not an array');
  const rows = manifest.entries.map(([date, tour, venue, code, source]) => {
    const sameDay = lives.filter(live => live?.date === date);
    const exact = sameDay.filter(live => typeof live.tour_name === 'string' && typeof live.venue === 'string'
      && key(live.tour_name) === key(tour) && key(live.venue) === key(venue));
    let status;
    if (exact.length === 0) status = sameDay.length ? 'identity_mismatch' : 'date_absent';
    else if (exact.length !== 1 || sameDay.length !== 1) status = 'ambiguous_public_record';
    else {
      const country = exact[0].metadata?.country;
      if (!country || !['confirmed', 'unreviewed'].includes(country.status)) status = 'metadata_unavailable';
      else if (country.status === 'confirmed' && country.code === code) status = 'already_confirmed';
      else if (country.status === 'confirmed') status = 'different_confirmed_country';
      else status = 'public_unreviewed_match';
    }
    return { date, code, source, status, matchedPublicId: exact.length === 1 ? exact[0].id : null, sameDayCount: sameDay.length };
  });
  const counts = Object.fromEntries([...new Set(rows.map(row => row.status))].sort().map(status => [status, rows.filter(row => row.status === status).length]));
  return {
    evidenceCount: rows.length,
    publicLivesCount: lives.length,
    identityMatched: rows.filter(row => !['identity_mismatch', 'date_absent', 'ambiguous_public_record'].includes(row.status)).length,
    counts,
    // These are public-only observations. No status grants write approval or supplies a current admin revision.
    rows,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const details = args.includes('--details');
  const index = args.indexOf('--environment');
  if (index < 0 || index + 1 >= args.length || args.length !== (details ? 3 : 2)
      || args.filter(arg => arg === '--details').length > 1) {
    throw new Error('Usage: node scripts/audit/preview-live-country.mjs --environment staging|production [--details]');
  }
  const environment = args[index + 1];
  if (!Object.hasOwn(ENDPOINTS, environment)) throw new Error('Unknown environment');
  const manifest = validateManifest(JSON.parse(readFileSync(manifestUrl, 'utf8')));
  const response = await fetch(ENDPOINTS[environment], { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Public GET failed: HTTP ${response.status}`);
  const result = preview(manifest, await response.json());
  console.log(JSON.stringify({ environment, evidenceCount: result.evidenceCount, publicLivesCount: result.publicLivesCount,
    identityMatched: result.identityMatched, counts: result.counts, note: 'Public read-only preview; no admin revision or write approval.' }, null, 2));
  if (details) console.log(JSON.stringify(result.rows, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
