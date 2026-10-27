// End-to-end checks for critical flows. Run: npx playwright test tests/e2e (after `npm run build && npx vite preview --port 4173`)
import { test, expect } from '@playwright/test';
const BASE = process.env.BASE_URL ?? 'http://localhost:4173';

test('onboarding reaches the first conversation and replies', async ({ page }) => {
  await page.goto(`${BASE}/start`);
  await page.getByRole('button', { name: 'Spanish' }).first().click().catch(() => {});
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: /Start talking with/ }).click();
  await page.getByRole('button', { name: 'Start conversation' }).first().click();
  await page.getByLabel('Type your reply').fill('Yesterday I go to the restaurant');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('.turn.coach')).toHaveCount(2, { timeout: 5000 });
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await expect(page.getByText('Nice conversation.')).toBeVisible();
});

test('voice studio keeps meaningful "like" and resolves corrections', async ({ page }) => {
  await page.goto(`${BASE}/start`);
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: /Start talking with/ }).click();
  await page.goto(`${BASE}/app/studio`);
  await page.getByText('Paste or type spoken text instead').click();
  await page.getByLabel('Spoken text to process').fill('I like the design um move it to two actually make that three');
  await page.getByRole('button', { name: 'Add to transcript' }).click();
  await page.getByRole('button', { name: 'Polished' }).click();
  await expect(page.getByLabel('Result text (editable)')).toHaveValue(/I like the design move it to three\./);
});

test('theme selection persists', async ({ page }) => {
  await page.goto(`${BASE}/start`);
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: /Start talking with/ }).click();
  await page.goto(`${BASE}/app/settings`);
  await page.getByRole('button', { name: /Dark/ }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
