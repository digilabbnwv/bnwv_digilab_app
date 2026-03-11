import { test, expect } from '@playwright/test';

test.describe('Inloggen op Digilab', () => {

  test('medewerker kan inloggen met pincode 1234, ziet dashboard en kan weer uitloggen', async ({ page }) => {
    // 1. Ga naar de app login page (base url wordt verzorgd door config)
    await page.goto('/bnwv_digilab_app/');
    
    // We wachten totdat de pagina is geladen
    await expect(page).toHaveTitle(/Digilab/i);

    // 2. Zoek de velden op basis van hun label of placeholder en vul de mock gegevens in
    const emailVeld = page.getByPlaceholder('naam@bibliotheek.nl');
    await emailVeld.fill('jasper@bibliotheek.nl');

    const pinVeld = page.getByPlaceholder('•••••');
    await pinVeld.fill('12345');

    // 3. Klik op inloggen
    const loginKnop = page.getByRole('button', { name: /inloggen/i }).first();
    await loginKnop.click();

    // MOCK DB logt nu in en redirect naar het Dashboard. We zoeken naar de Scan QR knop.
    const scanKnop = page.getByText('Scan QR', { exact: false }).first();
    await expect(scanKnop).toBeVisible();

    // Laten we ook even uitloggen om de cirkel rond te maken. (Via het Profiel scherm)
    const profielKnop = page.getByRole('link', { name: /profiel/i }).first();
    await profielKnop.click();

    const uitlogKnop = page.getByText('Uitloggen', { exact: false }).first();
    await uitlogKnop.click();

    // Dan zouden we de Pincode invoer header weer moeten zien ("Voer je geheime medewerker pincode in")
    const loginHeader = page.locator('h1', { hasText: 'Digilab App' }).first();
    await expect(loginHeader).toBeVisible();
  });

});
