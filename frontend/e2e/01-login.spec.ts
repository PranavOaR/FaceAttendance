import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  });

  test('renders branding and form elements', async ({ page }) => {
    await expect(page.getByText('IDGuard').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });

  test('shows validation error for empty email', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/enter your email/i)).toBeVisible({ timeout: 6_000 });
  });

  test('browser blocks submit for invalid email format', async ({ page }) => {
    await page.locator('input[type="email"]').fill('not-an-email');
    await page.locator('input[type="password"]').fill('somepassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    // Browser's native type="email" validation blocks form submission —
    // the input enters :invalid state and no page navigation occurs.
    await expect(page.locator('input[type="email"]:invalid')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows validation error for empty password', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/enter.*password/i)).toBeVisible({ timeout: 6_000 });
  });

  test('toggles to sign-up mode and shows name field', async ({ page }) => {
    // The toggle button says "Create one" (inside "Don't have an account? Create one")
    await page.getByRole('button', { name: 'Create one' }).click();
    await expect(page.locator('input[placeholder="John Doe"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });
});
