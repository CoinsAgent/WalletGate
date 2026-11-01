import { test as base, expect } from '@playwright/test';
import { nextHTTPFixture } from '../lib/oidc-http-fixture';

// This suite loads the actual pinned SDK and its live relay. It intercepts no
// SDK methods and never supplies a wallet or signature. The OS launch attempt
// is observed through Chromium; opening an installed app needs a real phone.
const test = base.extend<{}, { idp: { issuer: string } }>({
  idp: [async ({}, use) => {
    const target = process.env.WALLET_REAL_SDK_URL;
    if (target) {
      const url = new URL(target);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Use a credential-free HTTPS preview origin');
      await use({ issuer: url.origin }); return;
    }
    const idp = await nextHTTPFixture(undefined, false,
      JSON.stringify({ '0x1': 'https://ethereum-rpc.publicnode.com' }));
    try { await use(idp); }
    finally { console.log(idp.serverLog().slice(-4000)); await idp.close(); }
  }, { scope: 'worker', timeout: 180_000 }],
});

test('real SDK attempts MetaMask app launch without an injected wallet', async ({ page, context, idp }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Page.enable'); await cdp.send('Log.enable');
  let appLaunch = false;
  let gestureBlocked = false;
  const diagnostic = (text: string) => {
    if (!text.includes('metamask://connect/mwp?')) return;
    if (/launch|handler|scheme/i.test(text)) appLaunch = true;
    if (/user gesture|user activation/i.test(text)) gestureBlocked = true;
  };
  const observe = (url: string) => { if (url.startsWith('metamask://connect/mwp?')) appLaunch = true; };
  cdp.on('Page.frameRequestedNavigation', event => observe(event.url));
  // A headless Ubuntu browser cannot handle metamask://. This diagnostic proves
  // an external launch was attempted, rather than just a QR modal being shown.
  cdp.on('Log.entryAdded', ({ entry }) => {
    diagnostic(entry.text);
  });
  page.on('console', message => {
    const text = message.text();
    diagnostic(text);
  });
  const verificationRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/auth/siwe/verify') verificationRequests.push(request.method()); });
  await page.goto(idp.issuer + '/sign-in', { waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => !!(window as Window & { ethereum?: unknown }).ethereum)).toBe(false);
  await page.getByRole('button', { name: 'MetaMask app', exact: true }).click();
  await page.getByRole('button', { name: '2. Connect wallet', exact: true }).click();
  try {
    await expect.poll(() => appLaunch, { timeout: 30_000,
      message: 'The real SDK must request metamask:// app launch, not only render a QR/install modal' }).toBe(true);
    expect(new URL(page.url()).origin).toBe(idp.issuer);
    expect(verificationRequests).toEqual([]);
    const sessionResponse = await page.request.get(idp.issuer + '/api/auth/get-session');
    expect(sessionResponse.status()).toBe(200);
    expect(await sessionResponse.json()).toBeNull();
    await expect(page.getByLabel('Wallet review')).toHaveCount(0);
    expect(gestureBlocked, 'Chrome must not reject the app launch for missing user activation').toBe(false);
    console.log(JSON.stringify({ realSDKLaunchObserved: appLaunch, gestureBlocked, walletVerificationRequests: verificationRequests.length }));
  } finally {
    const cancel = page.getByRole('button', { name: 'Cancel attempt', exact: true });
    if (await cancel.isVisible()) await cancel.click({ force: true });
    await cdp.detach();
  }
});
