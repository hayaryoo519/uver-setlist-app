import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validateManual, mergeManual, mergeCandidateSources, effectiveMetadata } = require('../../server/utils/liveMetadata');
const { validateArtist, normalizeArtistName } = require('../../server/utils/liveArtists');
const { buildSetlistCandidates } = require('../../server/services/liveMetadataCandidates');
const { effectiveLiveMetadata } = require('../../server/services/liveMetadataProjection');
const { metadataReviewSummary } = require('../../server/services/liveMetadataReview');

export async function installMetadataFixture(page, { imported = true, session = 'admin', withSongs = false } = {}) {
  // 楽曲フィルターのプレビュー用。実公演のセットリストを示すものではない。
  const fixtureSongs = withSongs ? [{ id: 101, title: 'CORE PRIDE' }, { id: 102, title: 'SHAMROCK' }] : [];
  const artist = { id: 10, name: 'Fixture Artist', aliases: ['FA'], revision: 0 };
  const other = { id: 11, name: 'Other Artist', aliases: ['OA'], revision: 0 };
  const raw = { id: 'fixture-import', eventDate: '28-12-2020', tour: { name: 'Fixture Xmas Birthday VS' },
    info: '未分類企画 <img src=x onerror="window.__fixtureExecuted=true">',
    venue: { name: 'Fixture Hall', city: { country: { code: 'KR' } } }, url: 'https://example.invalid/fixture', sets: { set: [] } };
  const lives = [
    { id: 43, tour_name: 'Fixture Festival', type: 'FESTIVAL' },
    { id: 44, tour_name: 'Fixture Mixed Roles', type: 'EVENT' },
    { id: 45, tour_name: 'Fixture Guest', type: 'ONEMAN' },
  ].map(live => ({ ...live, title: '', date: '2020-12-28', venue: 'Fixture Hall', special_note: '',
    setlist: (withSongs ? { 43: [101], 44: [102], 45: [101, 102] }[live.id] || [] : [])
      .map((id, position) => ({ ...fixtureSongs.find(song => song.id === id), position: position + 1 })),
    setlist_status: 'NORMAL' }));
  const metadata = new Map(lives.map(live => [live.id, { live_id: live.id, revision: 1, candidates: { tags: [] }, overrides: { country: { code: 'JP' } } }]));
  metadata.get(44).overrides.participants = { items: [{ artistId: 10, role: 'co_headliner' }, { artistId: 11, role: 'guest' }] };
  metadata.get(45).overrides.participants = { items: [{ artistId: 10, role: 'guest' }] };
  metadata.get(45).overrides.country = { code: 'KR' };
  const state = { lives, metadata, artists: [artist, other], raw, writes: [], unexpected: [], pageErrors: [], reviewError: false, conflictNext: false, expireMetadataNext: false, loginError: false };
  function addImported(payload = {}) {
    const live = { id: 42, tour_name: raw.tour.name, title: '', date: '2020-12-28', venue: raw.venue.name, type: 'HALL', special_note: raw.info, setlist: [], setlist_status: 'NORMAL', ...payload };
    delete live.metadata_source;
    lives.push(live);
    let candidates = mergeCandidateSources({}, buildSetlistCandidates(raw));
    candidates = mergeCandidateSources(candidates, { sourceId: 'uverworld.jp:fixture', tags: ['birthday', 'vs', 'christmas'], countryCode: 'JP', original: { title: raw.tour.name }, sourceUrl: 'https://example.invalid/official' });
    metadata.set(42, { live_id: 42, revision: 1, candidates, overrides: {} });
    return live;
  }
  if (imported) addImported();
  const admin = id => {
    const row = metadata.get(id);
    const effective = effectiveMetadata(row.candidates, row.overrides);
    return { ...row, effective, artists: state.artists.filter(value => effective.participants.items.some(item => item.artistId === value.id)) };
  };
  const publicLive = live => {
    const row = metadata.get(live.id);
    const effective = effectiveLiveMetadata(live, row.candidates, row.overrides);
    return { ...live, tags: effective.tags, metadata: { country: effective.country, members: effective.members,
      participants: { status: effective.participants.status, items: effective.participants.items.map(item => {
        const dictionary = state.artists.find(value => value.id === item.artistId);
        return { ...item, name: dictionary.name, aliases: dictionary.aliases };
      }) } } };
  };
  state.reimport = () => {
    const row = metadata.get(42);
    row.candidates = mergeCandidateSources(row.candidates, { sourceId: 'setlistfm:fixture-import', tags: ['christmas'], countryCode: 'US', original: { info: 'Fixture changed source' } });
    row.revision++;
  };
  page.on('pageerror', error => state.pageErrors.push(error.message));
  await page.addInitScript(mode => {
    if (sessionStorage.getItem('metadata-fixture-session-initialized')) return;
    sessionStorage.setItem('metadata-fixture-session-initialized', '1');
    if (mode === 'anonymous') return;
    const payload = btoa(JSON.stringify({ user_id: 1, role: 'admin', exp: mode === 'expired' ? 1 : 4102444800 }));
    localStorage.setItem('token', `eyJhbGciOiJIUzI1NiJ9.${payload}.fixture-only`);
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'Fixture Admin', role: 'admin' }));
  }, session);
  await page.context().route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:5188') return route.abort(); // 外部API/画像等には一切アクセスしない。
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const method = request.method(); const endpoint = url.pathname;
    const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (method === 'POST' && endpoint === '/api/auth/login') {
      if (state.loginError) return json({ message: 'Fixture login rejected' }, 401);
      const payload = btoa(JSON.stringify({ user_id: 1, role: 'admin', exp: 4102444800 }));
      return json({ token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fixture-only`, user: { id: 1, username: 'Fixture Admin', role: 'admin' } });
    }
    if (method === 'GET' && endpoint === '/api/lives/metadata-review') {
      if (state.reviewError) return json({ message: 'Fixture summary failure' }, 500);
      return json(lives.map(live => { const row = metadata.get(live.id); return metadataReviewSummary(live, row.candidates, row.overrides, row.revision); }));
    }
    if (method === 'GET' && endpoint === '/api/external/setlistfm/search') return json({ setlist: [raw], total: 1, itemsPerPage: 20 });
    if (method === 'GET' && endpoint === '/api/lives') {
      const selectedIds = (url.searchParams.get('songIds') || '').split(',').filter(Boolean).map(Number);
      return json(lives.filter(live => !withSongs || selectedIds.every(id => live.setlist.some(song => song.id === id))).map(publicLive));
    }
    if (method === 'POST' && endpoint === '/api/lives') {
      const body = request.postDataJSON(); state.writes.push({ endpoint, method, body });
      return json(addImported(body), 201);
    }
    const match = endpoint.match(/^\/api\/lives\/(\d+)(\/metadata)?$/);
    if (match) {
      const id = Number(match[1]);
      if (method === 'GET' && match[2] && state.expireMetadataNext) {
        state.expireMetadataNext = false;
        return json({ message: 'Fixture session expired' }, 401);
      }
      if (method === 'GET') return json(match[2] ? admin(id) : publicLive(lives.find(live => live.id === id)));
      if (method === 'PATCH' && match[2]) {
        const body = request.postDataJSON(); state.writes.push({ endpoint, method, body }); const row = metadata.get(id);
        if (state.conflictNext) { state.conflictNext = false; row.revision++; row.overrides.classification = { needsReview: true, note: 'Fixture server memo' }; }
        if (body.revision !== row.revision) return json({ message: 'Fixture revision conflict' }, 409);
        try { const next = mergeManual(row.overrides, validateManual(body.patch)); effectiveMetadata(row.candidates, next); row.overrides = next; row.revision++; }
        catch (error) { return json({ message: error.message }, 400); }
        return json(admin(id));
      }
    }
    if (method === 'GET' && endpoint === '/api/live-artists') return json(state.artists.filter(value => [value.name, ...value.aliases].some(name => normalizeArtistName(name).includes(normalizeArtistName(url.searchParams.get('search') || '')))));
    const artistMatch = endpoint.match(/^\/api\/live-artists\/(\d+)$/);
    if ((method === 'POST' && endpoint === '/api/live-artists') || (method === 'PATCH' && artistMatch)) {
      const body = request.postDataJSON(); state.writes.push({ endpoint, method, body });
      try {
        const value = validateArtist(body);
        const existing = artistMatch ? state.artists.find(item => item.id === Number(artistMatch[1])) : null;
        if (existing && existing.revision !== body.revision) return json({ message: 'Fixture artist conflict' }, 409);
        if (state.artists.some(item => item.id !== existing?.id && normalizeArtistName(item.name) === value.normalizedName)) return json({ message: 'Fixture duplicate artist' }, 409);
        const result = { id: existing?.id || Math.max(...state.artists.map(item => item.id)) + 1, name: value.name, aliases: value.aliases, revision: existing ? existing.revision + 1 : 0 };
        if (existing) Object.assign(existing, result); else state.artists.push(result);
        return json(result, existing ? 200 : 201);
      } catch (error) { return json({ message: error.message }, 400); }
    }
    if (method === 'GET' && endpoint === '/api/songs') return json(fixtureSongs);
    if (method === 'GET' && ['/api/users', '/api/corrections', '/api/users/me/lives', '/api/users/me/attended-lives', '/api/users/me/attended_lives'].includes(endpoint)) return json([]);
    if (method === 'GET' && endpoint === '/api/users/me') return json({ id: 1, role: 'admin', username: 'Fixture Admin' });
    state.unexpected.push(`${method} ${endpoint}`);
    return json({ message: 'Unexpected fixture API; real network blocked' }, 501);
  });
  return state;
}
