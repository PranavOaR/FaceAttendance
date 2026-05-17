import { test, expect } from '@playwright/test';

test.describe('Route protection', () => {
  test('root redirects to login or dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(url => url.pathname !== '/', { timeout: 8_000 }).catch(() => {});
    expect(page.url()).toMatch(/\/(login|dashboard)/);
  });

  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('login page is publicly accessible and renders', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBe(200);
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await expect(page.getByText('IDGuard').first()).toBeVisible();
  });
});
