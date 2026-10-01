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

    // Na inloggen landen we op het Dashboard. We zoeken naar de snelknoppen.
    const reserverenKnop = page.getByText('Reserveren', { exact: false }).first();
    await expect(reserverenKnop).toBeVisible();

    // Laten we ook even uitloggen om de cirkel rond te maken. (Via het Profiel scherm)
    const profielKnop = page.getByRole('link', { name: /profiel/i }).first();
    await profielKnop.click();

    const uitlogKnop = page.getByText('Uitloggen', { exact: false }).first();
    await uitlogKnop.click();

    // Dan zouden we de Pincode invoer header weer moeten zien ("Voer je geheime medewerker pincode in")
    const loginHeader = page.locator('h1', { hasText: 'Digilab App' }).first();
    await expect(loginHeader).toBeVisible();
  });

  test('medewerker kan via "Pincode vergeten" een nieuwe pincode instellen en daarmee inloggen', async ({ page }) => {
    // In mock-modus wordt de resetlink in de console gelogd i.p.v. gemaild.
    const resetLink = new Promise(resolve => {
      page.on('console', msg => {
        const match = msg.text().match(/resetlink: (\S+)/);
        if (match) resolve(match[1]);
      });
    });

    await page.goto('/bnwv_digilab_app/');
    await page.getByRole('link', { name: /pincode vergeten/i }).click();
    await expect(page.locator('h1', { hasText: 'Pincode vergeten' })).toBeVisible();

    await page.getByPlaceholder('naam@bibliotheek.nl').fill('jasper@bibliotheek.nl');
    await page.getByRole('button', { name: /resetlink versturen/i }).click();
    await expect(page.getByText(/ontvang je binnen enkele minuten een e-mail/i)).toBeVisible();

    await page.goto(await resetLink);
    await expect(page.locator('h1', { hasText: 'Nieuwe pincode instellen' })).toBeVisible();
    await page.getByLabel('Nieuwe pincode (5 cijfers)').fill('54321');
    await page.getByLabel('Herhaal nieuwe pincode').fill('54321');
    await page.getByRole('button', { name: /pincode opslaan/i }).click();
    await expect(page.getByText(/je pincode is gewijzigd/i)).toBeVisible();

    await page.getByRole('link', { name: /naar inloggen/i }).click();
    await page.getByPlaceholder('naam@bibliotheek.nl').fill('jasper@bibliotheek.nl');
    await page.getByPlaceholder('•••••').fill('54321');
    await page.getByRole('button', { name: /inloggen/i }).first().click();
    await expect(page.getByText('Reserveren', { exact: false }).first()).toBeVisible();
  });

});
