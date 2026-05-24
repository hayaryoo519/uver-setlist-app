import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const readGuestAccount = () => {
  if (!fs.existsSync('docs/prod_accounts.secret.md')) return null;

  const content = fs.readFileSync('docs/prod_accounts.secret.md', 'utf8');
  const match = content.match(/(?:一般ユーザー|ゲスト)テストアカウント[\s\S]*?メール\*\*: `([^`]+)`[\s\S]*?パスワード\*\*: `([^`]+)`/);

  if (!match) return null;
  return { email: match[1], password: match[2] };
};

test('トップページを表示できる', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: /UVERworld Setlist Archive/i })).toBeVisible();
  await expect(page.getByText('あの日の感動を、永遠に。')).toBeVisible();
  await expect(page.locator('a[href="/dashboard"]').filter({ hasText: 'データを見る' }).first()).toBeVisible();
});

test('一般ユーザーでログインしてマイページの参戦年表を表示できる', async ({ page }) => {
  const guest = readGuestAccount();
  test.skip(!guest, 'docs/prod_accounts.secret.md がない環境ではログインE2Eをスキップします');

  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(guest.email);
  await page.getByLabel('パスワード').fill(guest.password);
  await page.getByRole('button', { name: /ログイン/ }).click();

  await expect(page).toHaveURL(/\/mypage/);
  await expect(page.getByRole('heading', { name: '参戦年表' })).toBeVisible();
  await expect(page.getByText('最多参戦年')).toBeVisible();
});
