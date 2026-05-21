import { expect, test } from '@playwright/test';

test('トップページを表示できる', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: /UVERworld Setlist Archive/i })).toBeVisible();
  await expect(page.getByText('あの日の感動を、永遠に。')).toBeVisible();
  await expect(page.locator('a[href="/dashboard"]').filter({ hasText: 'データを見る' }).first()).toBeVisible();
});
