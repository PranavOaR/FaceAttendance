import { test, expect } from '@playwright/test';

/**
 * Full authenticated workflow tests.
 * Requires TEST_EMAIL and TEST_PASSWORD env vars pointing to a real Firebase account.
 * Skip gracefully when credentials are not provided.
 *
 * Run with:
 *   TEST_EMAIL=you@example.com TEST_PASSWORD=yourpass npx playwright test e2e/04-workflow.spec.ts
 */

const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
const hasCredentials = TEST_EMAIL !== '' && TEST_PASSWORD !== '';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
  await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

test.describe('Authenticated workflow', () => {
  test.skip(!hasCredentials, 'Set TEST_EMAIL and TEST_PASSWORD to run authenticated tests');

  test('can log in and reach dashboard', async ({ page }) => {
    await login(page);
    await expect(page.getByText(/IDGuard/i)).toBeVisible();
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });

  test('dashboard shows stats cards', async ({ page }) => {
    await login(page);
    // Stats cards should render (total classes, students, etc.)
    await expect(page.locator('[data-testid="stats-card"], .stats-card, [class*="stat"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('can open Add Class modal', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /add class|new class|create/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByPlaceholder(/class name/i)).toBeVisible();
  });

  test('Add Class form validates required fields', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /add class|new class|create/i }).first().click();
    await page.getByRole('button', { name: /create|save|add/i }).last().click();
    // Should show an error or the dialog stays open (form didn't submit)
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('can navigate to a class page', async ({ page }) => {
    await login(page);
    // Click the first class card if any exist
    const classCard = page.locator('[class*="card"], [class*="Card"]').first();
    const count = await classCard.count();
    if (count > 0) {
      await classCard.click();
      await page.waitForURL('**/class/**', { timeout: 8_000 });
      expect(page.url()).toMatch(/\/class\//);
    } else {
      test.info().annotations.push({ type: 'info', description: 'No classes found — skipping class navigation' });
    }
  });

  test('can reach reports page', async ({ page }) => {
    await login(page);
    await page.goto('/reports');
    await expect(page.getByText(/report/i)).toBeVisible({ timeout: 8_000 });
  });

  test('logout returns to login page', async ({ page }) => {
    await login(page);
    // Find logout button (in navbar / header)
    const logoutBtn = page.getByRole('button', { name: /log out|logout|sign out/i });
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();
      await page.waitForURL('**/login', { timeout: 8_000 });
      expect(page.url()).toContain('/login');
    }
  });
});
