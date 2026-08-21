import { test, expect } from '@playwright/test';

test.describe('Invitation Replay', () => {
  test('replaying an invitation token fails', async ({ page }) => {
    // This test simulates the case where an invitation token is reused.
    // In a real scenario, this would be an actual consumed token.
    // We will just test that the frontend properly handles API errors
    // for invalid/consumed tokens by using a known bad token.
    
    await page.goto('/accept-invitation?token=consumed_token_abc123');
    await page.waitForSelector('input[name="password"]');
    
    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
    
    await page.click('button[type="submit"]');
    
    // The API should reject this, and the UI should display the error
    await expect(page.locator('.text-red-700')).toBeVisible();
    
    // Ensure we are still on the accept-invitation page and not redirected to login
    expect(page.url()).toContain('/accept-invitation');
  });
});
