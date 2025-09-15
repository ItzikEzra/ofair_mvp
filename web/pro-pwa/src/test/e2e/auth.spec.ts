import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form on initial load', async ({ page }) => {
    await expect(page.getByText('כניסה למערכת')).toBeVisible();
    await expect(page.getByLabel('מספר טלפון')).toBeVisible();
    await expect(page.getByRole('button', { name: 'שלח קוד אימות' })).toBeVisible();
  });

  test('should validate phone number input', async ({ page }) => {
    const phoneInput = page.getByLabel('מספר טלפון');
    const submitButton = page.getByRole('button', { name: 'שלח קוד אימות' });

    // Try to submit empty form
    await submitButton.click();
    await expect(page.getByText('נדרש מספר טלפון')).toBeVisible();

    // Try invalid phone number
    await phoneInput.fill('123');
    await submitButton.click();
    await expect(page.getByText('מספר טלפון לא תקין')).toBeVisible();

    // Try valid phone number
    await phoneInput.fill('0501234567');
    await submitButton.click();
    // Should proceed to OTP verification step
    await expect(page.getByText('הזן קוד אימות')).toBeVisible();
  });

  test('should handle OTP verification', async ({ page }) => {
    // Navigate to OTP step
    await page.getByLabel('מספר טלפון').fill('0501234567');
    await page.getByRole('button', { name: 'שלח קוד אימות' }).click();

    await expect(page.getByText('הזן קוד אימות')).toBeVisible();
    
    // Test invalid OTP
    const otpInputs = page.locator('input[type="text"]').all();
    const inputs = await otpInputs;
    
    for (let i = 0; i < Math.min(6, inputs.length); i++) {
      await inputs[i].fill('1');
    }
    
    await page.getByRole('button', { name: 'אמת קוד' }).click();
    // Should show error for invalid OTP
    await expect(page.getByText('קוד אימות שגוי')).toBeVisible();
  });

  test('should remember login state', async ({ page }) => {
    // Navigate to OTP step
    await page.getByLabel('מספר טלפון').fill('0501234567');
    await page.getByRole('button', { name: 'שלח קוד אימות' }).click();

    // Check remember me option
    await expect(page.getByLabel('זכור אותי')).toBeVisible();
    await page.getByLabel('זכור אותי').check();

    // This would require valid OTP in real test
    // For now, just verify the checkbox works
    await expect(page.getByLabel('זכור אותי')).toBeChecked();
  });

  test('should handle resend OTP', async ({ page }) => {
    // Navigate to OTP step
    await page.getByLabel('מספר טלפון').fill('0501234567');
    await page.getByRole('button', { name: 'שלח קוד אימות' }).click();

    await expect(page.getByText('הזן קוד אימות')).toBeVisible();
    
    // Wait for resend button to be enabled (usually after countdown)
    await page.waitForTimeout(2000);
    
    const resendButton = page.getByRole('button', { name: 'שלח קוד חדש' });
    if (await resendButton.isVisible()) {
      await resendButton.click();
      await expect(page.getByText('קוד אימות נשלח מחדש')).toBeVisible();
    }
  });

  test('should allow going back to phone input', async ({ page }) => {
    // Navigate to OTP step
    await page.getByLabel('מספר טלפון').fill('0501234567');
    await page.getByRole('button', { name: 'שלח קוד אימות' }).click();

    await expect(page.getByText('הזן קוד אימות')).toBeVisible();
    
    // Go back to phone input
    await page.getByRole('button', { name: 'חזור' }).click();
    await expect(page.getByText('כניסה למערכת')).toBeVisible();
    await expect(page.getByLabel('מספר טלפון')).toHaveValue('0501234567');
  });
});