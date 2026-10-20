import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { preview, validateManifest } from './preview-live-country.mjs';

const evidence = { schemaVersion: 1, sources: { official: ['https://www.uverworld.jp/schedule/detail/123'] },
  entries: [['2026-08-29', 'Example Live', 'Example Hall', 'JP', 'official']] };
const live = (overrides = {}) => ({ id: 123, date: '2026-08-29', tour_name: 'Example Live', venue: 'Example Hall',
  metadata: { country: { status: 'unreviewed', code: null } }, ...overrides });

test('public unreviewed match is not an admin-approved write', () => {
  const result = preview(evidence, [live()]);
  assert.equal(result.identityMatched, 1);
  assert.equal(result.rows[0].status, 'public_unreviewed_match');
  assert.equal(result.rows[0].matchedPublicId, 123);
});

test('production-like missing metadata is unverifiable', () => {
  const result = preview(evidence, [live({ metadata: undefined })]);
  assert.equal(result.rows[0].status, 'metadata_unavailable');
});

test('same-day extra performances and duplicate exact matches are not auto-approved', () => {
  assert.equal(preview(evidence, [live(), live({ id: 124, tour_name: 'Second Show' })]).rows[0].status, 'ambiguous_public_record');
  assert.equal(preview(evidence, [live(), live({ id: 124 })]).rows[0].status, 'ambiguous_public_record');
});

test('title or venue mismatch is never inferred from city or date alone', () => {
  assert.equal(preview(evidence, [live({ venue: 'Example Hall A' })]).rows[0].status, 'identity_mismatch');
  assert.equal(preview(evidence, [live({ tour_name: 'Example Show' })]).rows[0].status, 'identity_mismatch');
  assert.equal(preview(evidence, []).rows[0].status, 'date_absent');
});

test('confirmed values are not overwritten by the preview', () => {
  assert.equal(preview(evidence, [live({ metadata: { country: { status: 'confirmed', code: 'JP' } } })]).rows[0].status, 'already_confirmed');
  assert.equal(preview(evidence, [live({ metadata: { country: { status: 'confirmed', code: 'KR' } } })]).rows[0].status, 'different_confirmed_country');
});

test('checked-in manifest carries only public evidence identities, not environment IDs', () => {
  const manifest = validateManifest(JSON.parse(readFileSync(new URL('./live-country-evidence.json', import.meta.url), 'utf8')));
  assert.equal(manifest.entries.length, 48);
  assert.equal(manifest.entries.filter(row => row[3] === 'KR').length, 1);
  assert.equal(manifest.entries.filter(row => row[3] === 'JP').length, 47);
  assert.ok(manifest.entries.every(row => row.length === 5 && row.every(value => typeof value === 'string')));
});

test('manifest requires public official sources, unique identities and ISO proposals', () => {
  assert.equal(validateManifest(evidence).entries.length, 1);
  assert.throws(() => validateManifest({ ...evidence, entries: [...evidence.entries, evidence.entries[0]] }), /Duplicate/);
  assert.throws(() => validateManifest({ ...evidence, entries: [['2026-08-29', 'X', 'Y', 'XX', 'official']] }), /Invalid country/);
  assert.throws(() => validateManifest({ ...evidence, sources: { official: ['http://evil.example/'] } }), /Invalid official/);
});
