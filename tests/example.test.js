// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('NYLA Go Test Setup Validation', () => {
  test('should be able to run tests successfully', async ({ page }) => {
    // Simple test to verify setup works
    await page.goto('data:text/html,<h1>Test Setup Working!</h1>');
    await expect(page.locator('h1')).toHaveText('Test Setup Working!');
  });

  test('should have access to test utilities', async () => {
    const { DEFAULT_TOKENS, SELECTORS } = require('./test-utils');
    
    // Verify test utilities are accessible
    expect(DEFAULT_TOKENS).toContain('NYLA');
    expect(DEFAULT_TOKENS).toContain('SOL');
    expect(SELECTORS.logo).toBe('.header-logo');
  });
});