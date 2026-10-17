import { test, expect } from '@playwright/test';
import { installMetadataFixture } from './metadata-fixture.js';

const visibleLabel = (page, name) => page.getByRole('combobox', { name, exact: true }).filter({ visible: true });
const card = (page, id) => page.locator(`a[href="/live/${id}"]:visible`);
async function publicFilters(page, isMobile) {
  if (isMobile) await page.getByRole('button', { name: '絞り込みフィルター' }).click();
}
async function assertClean(state) {
  expect(state.unexpected).toEqual([]);
  expect(state.pageErrors).toEqual([]);
}

for (const [session, target] of [
  ['anonymous', '/admin?tab=lives&metadata=42'],
  ['expired', '/admin?tab=lives&review=unconfirmed'],
]) {
  test(`${session}から通知リンクを開き、ログイン失敗後も対象へ復帰する`, async ({ page }) => {
    const state = await installMetadataFixture(page, { session });
    await page.goto(target);
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('メールアドレス').fill('fixture@example.invalid');
    await page.getByLabel('パスワード', { exact: true }).fill('fixture-only');
    state.loginError = true;
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await expect(page.getByText('Fixture login rejected')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    state.loginError = false;
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:5188' + target);
    if (session === 'anonymous') await expect(page.getByRole('dialog').getByText('現在の有効情報')).toBeVisible();
    else await expect(page.getByRole('combobox', { name: '追加情報レビュー', exact: true })).toHaveValue('UNCONFIRMED');
    await assertClean(state);
  });
}

test('APIの401による再ログインでも単件レビューURLを保持する', async ({ page }) => {
  const state = await installMetadataFixture(page);
  await page.goto('/admin?tab=lives&metadata=42');
  await expect(page.getByRole('dialog').getByText('現在の有効情報')).toBeVisible();
  state.expireMetadataNext = true;
  page.once('dialog', prompt => prompt.accept());
  await page.getByRole('button', { name: '最新情報を再読み込み' }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  const loginUrl = new URL(page.url());
  expect(loginUrl.searchParams.get('returnTo')).toBe('/admin?tab=lives&metadata=42');
  await page.getByLabel('メールアドレス').fill('fixture@example.invalid');
  await page.getByLabel('パスワード', { exact: true }).fill('fixture-only');
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5188/admin?tab=lives&metadata=42');
  await expect(page.getByRole('dialog').getByText('現在の有効情報')).toBeVisible();
  await assertClean(state);
});

test('合成取り込み→レビュー保存→公開検索→再取得で手動設定を保持', async ({ page, isMobile }, testInfo) => {
  const state = await installMetadataFixture(page, { imported: false });
  await page.goto('/admin?tab=collect');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByTitle('Import This Setlist')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByTitle('Import This Setlist').click();
  await expect.poll(() => state.metadata.has(42)).toBe(true);
  expect(state.writes[0].body.metadata_source.original.id).toBe('fixture-import');
  await page.goto('/admin?tab=lives&metadata=42');
  const dialog = page.getByRole('dialog', { name: 'ライブ追加情報の確認・修正' });
  await expect(dialog.getByText('現在の有効情報')).toBeVisible();
  await expect(dialog.getByText(/取得元の不一致/)).toBeVisible();
  await dialog.locator('summary').first().click();
  await expect(dialog.locator('pre').first()).toContainText('Fixture');
  expect(await page.evaluate(() => !!window.__fixtureExecuted)).toBe(false);
  await dialog.getByRole('combobox', { name: 'クリスマス', exact: true }).selectOption('remove');
  await dialog.getByLabel('開催国の確認状態').selectOption('confirmed');
  await dialog.getByLabel('開催国コード').fill('KR');
  await dialog.getByLabel('対象メンバーの確認状態').selectOption('confirmed');
  await dialog.getByLabel('TAKUYA∞', { exact: true }).check();
  await dialog.getByLabel('共演者の確認状態').selectOption('confirmed');
  await dialog.getByLabel('共演アーティストを検索').fill('FA');
  await dialog.getByRole('button', { name: 'アーティストを検索', exact: true }).click();
  await dialog.getByRole('button', { name: 'Fixture Artistを選択' }).click();
  await dialog.getByRole('button', { name: '共演者を追加', exact: true }).click();
  await dialog.getByRole('button', { name: '追加情報を保存', exact: true }).click();
  await expect(dialog.getByText('追加情報を保存しました。')).toBeVisible();
  const saved = structuredClone(state.metadata.get(42).overrides);
  expect(saved.participants.items).toEqual([{ artistId: 10, role: 'co_headliner' }]);
  expect(saved.tagOverrides.remove).toContain('christmas');
  await dialog.evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: testInfo.outputPath('metadata-review.png'), fullPage: true });
  await page.getByRole('button', { name: '追加情報を閉じる' }).click();
  await page.goto('/lives');
  await publicFilters(page, isMobile);
  await page.getByPlaceholder('ツアー名・会場・共演者で検索').fill('ＦＡ');
  await visibleLabel(page, '開催国').selectOption('KR');
  await visibleLabel(page, '生誕祭の対象メンバー').selectOption('takuya');
  await visibleLabel(page, '共演アーティスト').selectOption('10');
  await visibleLabel(page, '共演の役割').selectOption('co_headliner');
  await expect(card(page, 42)).toBeVisible();
  await expect(card(page, 44)).toHaveCount(0);
  await expect(card(page, 45)).toHaveCount(0);
  await expect(card(page, 42)).toContainText('対バン相手：Fixture Artist');
  await expect(card(page, 42)).not.toContainText('クリスマス');
  await page.screenshot({ path: testInfo.outputPath('metadata-public-filter.png'), fullPage: true });
  state.reimport();
  await page.reload();
  await publicFilters(page, isMobile);
  await visibleLabel(page, '共演アーティスト').selectOption('10');
  await visibleLabel(page, '共演の役割').selectOption('co_headliner');
  await visibleLabel(page, '開催国').selectOption('KR');
  await expect(card(page, 42)).toBeVisible();
  expect(state.metadata.get(42).overrides).toEqual(saved);
  await card(page, 42).click();
  await expect(page).toHaveURL(/\/live\/42$/);
  await expect(page.getByText('対バン相手：Fixture Artist', { exact: true })).toBeVisible();
  await assertClean(state);
});

test('アーティストと役割を同じ関連に一致させ、モバイルでも解除できる', async ({ page, isMobile }, testInfo) => {
  const state = await installMetadataFixture(page);
  await page.goto('/lives'); await publicFilters(page, isMobile);
  await visibleLabel(page, '共演アーティスト').selectOption('10');
  await visibleLabel(page, '共演の役割').selectOption('guest');
  await expect(card(page, 45)).toBeVisible();
  await expect(card(page, 44)).toHaveCount(0); // 別アーティストのguestを拾わない。
  await expect(card(page, 42)).toHaveCount(0); // 原文から共演者を確定しない。
  await page.getByRole('button', { name: '共演役割フィルターを解除' }).click();
  await expect(card(page, 44)).toBeVisible();
  await expect(card(page, 45)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('metadata-role-filter.png'), fullPage: true });
  await assertClean(state);
});

test('通知リンクのフォーカス循環、409で入力保持、再読込後の保存と再オープン防止', async ({ page }) => {
  const state = await installMetadataFixture(page);
  await page.goto('/admin?tab=lives&metadata=42');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('現在の有効情報')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expect.poll(() => page.locator('.metadata-overlay').evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return element.parentElement === document.body && Math.abs(bounds.top) < 1 && Math.abs(bounds.height - innerHeight) < 1;
  })).toBe(true);
  expect(await page.evaluate(() => !!document.elementFromPoint(innerWidth / 2, innerHeight - 10)?.closest('.metadata-overlay'))).toBe(true);
  await page.screenshot({ path: test.info().outputPath('metadata-viewport-dialog.png') });
  await dialog.getByLabel('管理用メモ').fill('Fixture unsaved memo');
  const close = dialog.getByRole('button', { name: '追加情報を閉じる' });
  const save = dialog.getByRole('button', { name: '追加情報を保存', exact: true });
  await close.focus(); await page.keyboard.press('Shift+Tab'); await expect(save).toBeFocused();
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  page.once('dialog', prompt => prompt.dismiss()); await page.keyboard.press('Escape');
  await expect(dialog.getByLabel('管理用メモ')).toHaveValue('Fixture unsaved memo');
  state.conflictNext = true;
  await save.click();
  await expect(dialog.getByRole('alert')).toContainText('別の更新');
  await expect(dialog.getByLabel('管理用メモ')).toHaveValue('Fixture unsaved memo');
  await expect(save).toBeDisabled();
  page.once('dialog', prompt => prompt.accept()); await dialog.getByRole('button', { name: '最新情報を再読み込み' }).click();
  await expect(dialog.getByLabel('管理用メモ')).toHaveValue('Fixture server memo');
  await dialog.getByLabel('管理用メモ').fill('Fixture corrected memo'); await save.click();
  await expect(dialog.getByText('追加情報を保存しました。')).toBeVisible();
  await close.click();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await page.getByRole('button', { name: '一覧とレビュー情報を更新' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // 実Pushではなく、SW→ページのメッセージ契約をブラウザ内で模擬する。
  const notify = url => page.evaluate(target => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {
    origin: location.origin, data: { type: 'metadata-review-notification', url: location.origin + target },
  })), url);
  await notify('/admin?tab=lives&metadata=4');
  await expect(dialog).toHaveCount(0);
  await notify('/admin?tab=lives&metadata=42');
  await expect(dialog.getByLabel('管理用メモ')).toHaveValue('Fixture corrected memo');
  await dialog.getByLabel('管理用メモ').fill('Fixture repeat notification unsaved');
  await notify('/admin?tab=lives&metadata=42');
  await expect(dialog.getByLabel('管理用メモ')).toHaveValue('Fixture repeat notification unsaved');
  page.once('dialog', prompt => prompt.accept()); await close.click();
  await page.getByRole('button', { name: '一覧とレビュー情報を更新' }).click();
  await expect(dialog).toHaveCount(0);
  await assertClean(state);
});

test('同じ未確認一覧通知を再クリックするとレビュー条件を再選択する', async ({ page }) => {
  const state = await installMetadataFixture(page);
  await page.goto('/admin?tab=lives&review=unconfirmed');
  const filter = page.getByRole('combobox', { name: '追加情報レビュー', exact: true });
  await expect(filter).toHaveValue('UNCONFIRMED');
  await filter.selectOption('ALL');
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {
    origin: location.origin, data: { type: 'metadata-review-notification', url: location.href },
  })));
  await expect(filter).toHaveValue('UNCONFIRMED');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await assertClean(state);
});

test('辞書登録は公演へ自動追加せず、名称修正後も同じID・別名で検索できる', async ({ page, isMobile }) => {
  const state = await installMetadataFixture(page);
  await page.goto('/admin?tab=lives&metadata=42');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('現在の有効情報')).toBeVisible();
  await dialog.getByLabel('共演者の確認状態').selectOption('confirmed');
  await dialog.getByRole('button', { name: '新しいアーティストを登録' }).click();
  await dialog.getByLabel('アーティスト正式名').fill('New Fixture Artist');
  await dialog.getByLabel('アーティスト別名（1行に1つ）').fill('NFA');
  await dialog.getByRole('button', { name: 'アーティスト辞書を保存' }).click();
  await expect(dialog.getByText(/アーティスト辞書を保存しました/)).toBeVisible();
  expect(state.metadata.get(42).overrides.participants).toBeUndefined();
  await dialog.getByRole('button', { name: '共演者を追加', exact: true }).click();
  await dialog.getByRole('button', { name: '追加情報を保存', exact: true }).click();
  await expect(dialog.getByText('追加情報を保存しました。')).toBeVisible();
  expect(state.metadata.get(42).overrides.participants.items).toEqual([{ artistId: 12, role: 'co_headliner' }]);
  await dialog.getByRole('button', { name: '選択アーティストの辞書を修正' }).click();
  await dialog.getByLabel('アーティスト正式名').fill('Renamed Fixture Artist');
  await dialog.getByRole('button', { name: 'アーティスト辞書を保存' }).click();
  await expect(dialog.getByText('選択中：Renamed Fixture Artist')).toBeVisible();
  await dialog.getByRole('button', { name: '追加情報を閉じる' }).click();
  await page.goto('/lives'); await publicFilters(page, isMobile);
  await page.getByPlaceholder('ツアー名・会場・共演者で検索').fill('ＮＦＡ');
  await visibleLabel(page, '共演アーティスト').selectOption('12');
  await expect(card(page, 42)).toBeVisible();
  await expect(card(page, 42)).toContainText('対バン相手：Renamed Fixture Artist');
  expect(state.metadata.get(42).overrides.participants.items[0].artistId).toBe(12);
  await assertClean(state);
});

test('レビュー取得失敗を0件とせず、再取得で回復する', async ({ page }) => {
  const state = await installMetadataFixture(page);
  await page.goto('/admin?tab=lives&review=unconfirmed');
  await expect(page.getByRole('option', { name: /未確認（1）/ })).toBeAttached();
  state.reviewError = true;
  await page.getByRole('button', { name: '一覧とレビュー情報を更新' }).click();
  await expect(page.getByRole('alert')).toContainText('未確認件数を0件とは扱いません');
  await expect(page.getByRole('option', { name: '未確認（—）', exact: true })).toHaveJSProperty('disabled', true);
  state.reviewError = false;
  await page.getByRole('button', { name: 'レビュー情報を再取得' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('option', { name: '未確認（1）', exact: true })).toHaveJSProperty('disabled', false);
  await assertClean(state);
});
