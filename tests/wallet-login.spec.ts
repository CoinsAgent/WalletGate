import { test as base, expect, type Page } from '@playwright/test';
import { privateKeyToAccount } from 'viem/accounts';
import { hexToString, type Hex } from 'viem';
import { nextHTTPFixture } from '../lib/oidc-http-fixture';
import { StandardRP } from '../examples/oidc-rp';
const test = base.extend<{}, { idp: Awaited<ReturnType<typeof nextHTTPFixture>> }>({
  idp: [async ({}, use) => { const fixture = await nextHTTPFixture(undefined, true); try { await use(fixture); } finally { console.log(fixture.serverLog().slice(-12000)); await fixture.close(); } }, { scope: 'worker', timeout: 180_000 }],
});
async function wallets(page: Page, mode: 'multi' | 'legacy' | 'none' = 'multi') {
  const signed: { index: number; message: string }[] = [];
  await page.exposeFunction('fixtureSign', async (index: number, message: Hex) => {
    signed.push({ index, message: hexToString(message) });
    return privateKeyToAccount(`0x${String(index + 1).padStart(64, '0')}`).signMessage({ message: hexToString(message) });
  });
  const addresses = [0, 1].map(i => privateKeyToAccount(`0x${String(i + 1).padStart(64, '0')}`).address);
  await page.addInitScript(({ addresses, mode }) => {
    const w = window as any;
    w.walletCalls = [];
    w.fixtureProviders = addresses.map((address, index) => {
      const listeners: Record<string, Function[]> = {};
      return { request: async ({ method, params }: any) => {
        w.walletCalls.push({ index, method });
        if (w.walletFailure?.method === method) { const code = w.walletFailure.code; w.walletFailure = undefined; throw { code }; }
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address];
        if (method === 'eth_chainId') return '0x1';
        if (method === 'personal_sign') return w.fixtureSign(index, params[0]);
        throw { code: 4200 };
      }, on: (event: string, fn: Function) => { (listeners[event] ??= []).push(fn); },
      removeListener: (event: string, fn: Function) => { listeners[event] = (listeners[event] ?? []).filter(f => f !== fn); },
      emit: (event: string, data: unknown) => { for (const fn of listeners[event] ?? []) fn(data); } };
    });
    if (mode !== 'none') w.ethereum = w.fixtureProviders[0];
    const announce = (indices = [0, 1]) => indices.forEach(index => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { provider: w.fixtureProviders[index], info: {
      uuid: `00000000-0000-4000-8000-00000000000${index}`, name: `Fixture Wallet ${index + 1}`, rdns: `test.wallet${index}`, icon: 'data:image/svg+xml,<svg/>' } } })));
    w.fixtureAnnounce = announce;
    if (mode === 'multi') window.addEventListener('eip6963:requestProvider', () => announce());
  }, { addresses, mode });
  return { signed, addresses };
}
async function begin(page: Page, idp: Awaited<ReturnType<typeof nextHTTPFixture>>, client = 0) {
  const rp = await StandardRP.discover(idp.issuer);
  const { transaction, url } = rp.start(idp.clients[client], idp.redirectURI);
  await page.route(idp.redirectURI + '**', route => route.fulfill({ body: 'Independent RP callback' }));
  await page.goto(url.href);
  return { rp, transaction };
}
async function review(page: Page, index = 0) {
  await page.getByRole('button', { name: `Fixture Wallet ${index + 1}`, exact: true }).click();
  await page.getByRole('button', { name: '2. Connect wallet', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in with Ethereum', exact: true })).toBeEnabled();
}
async function sign(page: Page) {
  await page.getByRole('button', { name: 'Sign in with Ethereum', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Authorize', exact: true })).toBeEnabled();
}
async function callback(page: Page, redirectURI: string) {
  await expect.poll(() => page.url().startsWith(redirectURI + '?')).toBe(true);
  return page.url();
}
test('discovery requires explicit selection, preserves late wallets and legacy fallback', async ({ page, idp }) => {
  await wallets(page, 'legacy'); await begin(page, idp);
  const legacy = page.getByRole('button', { name: 'Browser wallet (legacy)', exact: true });
  await expect(legacy).toBeVisible();
  await expect(page.getByRole('button', { name: '2. Connect wallet', exact: true })).toBeDisabled();
  await legacy.focus(); await page.keyboard.press('Enter');
  await expect(legacy).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => (window as any).fixtureAnnounce([0, 1]));
  await expect(page.getByRole('button', { name: 'Fixture Wallet 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Fixture Wallet 2', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).walletCalls)).toEqual([]);
  await expect(page.getByText('Session information', { exact: true })).toHaveCount(0);
});
test('layout gives no-wallet guidance and reachable mobile controls', async ({ page, idp }, testInfo) => {
  await wallets(page, 'none'); await begin(page, idp);
  await expect(page.getByText(/No Ethereum wallet found/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'MetaMask app', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('no-wallet.png'), fullPage: true });
});
test('recovery handles declined connection, unsupported operation, rejected signature and server failure with fresh retry', async ({ page, idp }, testInfo) => {
  const fixture = await wallets(page); await begin(page, idp);
  await page.getByRole('button', { name: 'Fixture Wallet 1', exact: true }).click();
  for (const code of [4001, 4200, 4900]) {
    await page.evaluate(code => { (window as any).walletFailure = { method: 'eth_requestAccounts', code }; }, code);
    await page.getByRole('button', { name: '2. Connect wallet', exact: true }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(code === 4001 ? 'declined' : code === 4200 ? 'does not support' : 'disconnected');
  }
  await review(page);
  const originalURL = page.url();
  await page.evaluate(() => { (window as any).walletFailure = { method: 'personal_sign', code: 4001 }; });
  await page.getByRole('button', { name: 'Sign in with Ethereum', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('declined'); expect(page.url()).toBe(originalURL);
  await review(page);
  await page.route('**/api/auth/siwe/verify', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Verification temporarily unavailable' }) }));
  await page.getByRole('button', { name: 'Sign in with Ethereum', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('Verification temporarily unavailable'); expect(page.url()).toBe(originalURL);
  await page.screenshot({ path: testInfo.outputPath('recovery.png'), fullPage: true });
  await page.unroute('**/api/auth/siwe/verify'); await review(page); await sign(page);
  expect(fixture.signed).toHaveLength(2); expect(fixture.signed[0].message).not.toBe(fixture.signed[1].message);
});
test('recovery invalidates reviewed account, chain, disconnect and provider selection', async ({ page, idp }) => {
  await wallets(page); await begin(page, idp);
  for (const event of ['accountsChanged', 'chainChanged', 'disconnect']) {
    await review(page);
    await page.evaluate(event => (window as any).fixtureProviders[0].emit(event, []), event);
    await expect(page.locator('p[role="alert"]')).toContainText('changed');
    await expect(page.getByRole('button', { name: 'Sign in with Ethereum', exact: true })).toHaveCount(0);
  }
  await review(page); await page.getByRole('button', { name: 'Fixture Wallet 2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in with Ethereum', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).walletCalls.filter((c: any) => c.method === 'personal_sign'))).toEqual([]);
});
for (const index of [0, 1]) test(`fresh SIWE provider ${index + 1} and client ${index + 1} return to independent RP`, async ({ page, idp }, testInfo) => {
  const fixture = await wallets(page); const { rp, transaction } = await begin(page, idp, index);
  await review(page, index);
  await expect(page.getByLabel('Wallet review')).toContainText(fixture.addresses[index]);
  await expect(page.getByLabel('Wallet review')).toContainText(new URL(idp.issuer).host);
  expect(fixture.signed).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const control = await page.getByRole('button', { name: 'Sign in with Ethereum', exact: true }).boundingBox();
  expect(control!.height).toBeGreaterThanOrEqual(44);
  expect(control!.x).toBeGreaterThanOrEqual(0);
  expect(control!.x + control!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await page.evaluate(() => (window as any).walletCalls.some((c: any) => c.method === 'personal_sign'))).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('review.png'), fullPage: true });
  await sign(page);
  expect(fixture.signed).toHaveLength(1); expect(fixture.signed[0].index).toBe(index);
  expect(fixture.signed[0].message).toContain(fixture.addresses[index]);
  expect(fixture.signed[0].message).toContain(new URL(idp.issuer).host);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('consent.png'), fullPage: true });
  await page.getByRole('button', { name: 'Authorize', exact: true }).click();
  const returned = await callback(page, idp.redirectURI);
  const changedState = new URL(returned); changedState.searchParams.set('state', 'wrong');
  expect(() => rp.callback(transaction, changedState.href)).toThrow('state mismatch');
  const tokens = await rp.exchange(transaction, rp.callback(transaction, returned));
  const claims = await rp.verifyIDToken(tokens.id_token!, transaction.clientId, transaction.nonce);
  expect((await rp.userInfo(tokens.access_token)).sub).toBe(claims.sub);
  await expect(rp.verifyIDToken(tokens.id_token!, transaction.clientId, 'wrong-nonce')).rejects.toThrow();
  await expect(rp.verifyIDToken(tokens.id_token!, 'wrong-client', transaction.nonce)).rejects.toThrow();
  const parts = tokens.id_token!.split('.'); parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
  await expect(rp.verifyIDToken(parts.join('.'), transaction.clientId, transaction.nonce)).rejects.toThrow();
  await page.screenshot({ path: testInfo.outputPath('callback.png'), fullPage: true });
});
test('consent cancellation returns access_denied and never issues an authorization code', async ({ page, idp }) => {
  await wallets(page); const { rp, transaction } = await begin(page, idp, 1); await review(page, 1); await sign(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const returned = await callback(page, idp.redirectURI); const params = new URL(returned).searchParams;
  expect(params.get('error')).toBe('access_denied'); expect(params.has('code')).toBe(false);
  expect(() => rp.callback(transaction, returned)).toThrow('Authorization denied');
});
test('browser authorization remains bound to the original PKCE verifier', async ({ page, idp }) => {
  await wallets(page); const { rp, transaction } = await begin(page, idp); await review(page); await sign(page);
  await page.getByRole('button', { name: 'Authorize', exact: true }).click();
  const code = rp.callback(transaction, await callback(page, idp.redirectURI));
  await expect(rp.exchange(transaction, code, 'x'.repeat(43))).rejects.toThrow('invalid_grant');
});
test('tampered signed continuation fails without creating a session or reaching consent', async ({ page, idp }) => {
  await wallets(page); await begin(page, idp);
  const sessions = await idp.count('session');
  const tampered = new URL(page.url()); tampered.searchParams.set('state', 'tampered-state');
  await page.goto(tampered.href); await review(page);
  const verified = page.waitForResponse(r => r.url().endsWith('/siwe/verify'));
  await page.getByRole('button', { name: 'Sign in with Ethereum', exact: true }).click();
  expect((await verified).status()).toBeGreaterThanOrEqual(400);
  await expect(page.locator('p[role="alert"]')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/sign-in');
  expect(await idp.count('session')).toBe(sessions);
  await expect(page.getByRole('button', { name: 'Authorize', exact: true })).toHaveCount(0);
});
test('production alternate login and anonymous registration stay denied through browser HTTP', async ({ page, idp }) => {
  const before = await idp.count('oauthClient'); const sessions = await idp.count('session');
  for (const path of ['/sign-in/email', '/sign-up/email', '/sign-in/social', '/oauth2/register', '/oauth2/create-client', '/admin/oauth2/create-client']) {
    const result = await page.request.post(idp.issuer + '/api/auth' + path, { headers: { Origin: idp.issuer }, data: { email: 'control@example.com', password: 'test-password-123', name: 'Control', provider: 'github', client_name: 'Unauthorized', redirect_uris: [idp.redirectURI], application_type: 'native', token_endpoint_auth_method: 'none' } });
    expect(path.startsWith('/admin/') ? [404] : [401, 403]).toContain(result.status());
    const text = await result.text(); const body = text ? JSON.parse(text) : {};
    for (const key of ['client_id', 'client_secret', 'access_token', 'token', 'session']) expect(body).not.toHaveProperty(key);
  }
  expect(await idp.count('oauthClient')).toBe(before); expect(await idp.count('session')).toBe(sessions);
});
test('wallet metadata renders as literal text without executing names or icons', async ({ page, idp }) => {
  await wallets(page); await begin(page, idp);
  // Announcements are transient: wait until client-side discovery is listening.
  await expect(page.getByRole('button', { name: 'Fixture Wallet 1', exact: true })).toBeVisible();
  const name = '<img src=x onerror="window.walletMetadataExecuted=true">';
  await page.evaluate(name => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { provider: { request: async () => [] }, info: {
      uuid: '00000000-0000-4000-8000-000000000003', name, rdns: 'untrusted.test', icon: 'data:image/svg+xml,<svg onload="window.walletMetadataExecuted=true"/>' } } }));
  }, name);
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).walletMetadataExecuted)).toBeUndefined();
  expect(await page.getByRole('button', { name, exact: true }).locator('img,svg,script').count()).toBe(0);
});
test('unsafe callback stays on the IdP and is never followed', async ({ page, idp }) => {
  const rp = await StandardRP.discover(idp.issuer);
  const { url } = rp.start(idp.clients[0], 'https://unregistered.example/callback');
  const external: string[] = [];
  page.on('request', request => { if (request.url().startsWith('https://unregistered.example')) external.push(request.url()); });
  await page.goto(url.href);
  expect(new URL(page.url()).origin).toBe(idp.issuer);
  expect(new URL(page.url()).searchParams.get('error')).toBe('invalid_redirect');
  expect(new URL(page.url()).searchParams.has('code')).toBe(false);
  expect(external).toEqual([]);
});

async function remoteWallet(page: Page) {
  const fixture = await wallets(page, 'none');
  await page.addInitScript(() => {
    const w = window as any;
    w.remoteLaunches = 0; w.remoteDisconnects = 0;
    w.remoteSDK = {
      connect: async () => {
        w.remoteLaunches++;
        if (w.remoteRejected) { w.remoteRejected = false; throw { code: 4001 }; }
        if (w.remotePending) await new Promise(resolve => { w.resolveRemote = resolve; });
        return { accounts: await w.fixtureProviders[1].request({ method: 'eth_requestAccounts' }), chainId: '0x1' };
      },
      disconnect: async () => { w.remoteDisconnects++; },
      getProvider: () => w.fixtureProviders[1],
    };
  });
  return fixture;
}
test('remote mobile app path keeps original browser, reviews and signs fresh SIWE before consent and RP return', async ({ page, idp }, info) => {
  const fixture = await remoteWallet(page); const { rp, transaction } = await begin(page, idp, 1);
  const original = page.url();
  expect(await page.evaluate(() => !!(window as any).ethereum)).toBe(false);
  await page.getByRole('button', { name: 'MetaMask app', exact: true }).click();
  expect(await page.evaluate(() => (window as any).remoteLaunches)).toBe(0);
  await page.getByRole('button', { name: '2. Connect wallet', exact: true }).click();
  await expect(page.getByLabel('Wallet review')).toContainText(fixture.addresses[1]);
  expect(page.url()).toBe(original); expect(fixture.signed).toHaveLength(0);
  const options = await page.evaluate(() => (window as any).remoteSDK.options);
  expect(options.dapp).toEqual({ name: 'WalletGate', url: idp.issuer });
  expect(JSON.stringify(options)).not.toContain('client_id'); expect(options.analytics.enabled).toBe(false);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByRole('note')).toContainText('Back in this browser');
  await page.screenshot({ path: info.outputPath('remote-review.png'), fullPage: true });
  await sign(page); await page.getByRole('button', { name: 'Authorize', exact: true }).click();
  const tokens = await rp.exchange(transaction, rp.callback(transaction, await callback(page, idp.redirectURI)));
  const claims = await rp.verifyIDToken(tokens.id_token!, transaction.clientId, transaction.nonce);
  expect((await rp.userInfo(tokens.access_token)).sub).toBe(claims.sub); expect(fixture.signed).toHaveLength(1);
  expect(fixture.signed[0].index).toBe(1);
});
test('remote recovery preserves transaction on rejection, cancellation, late result and provider change', async ({ page, idp }) => {
  const fixture = await remoteWallet(page); await begin(page, idp); const original = page.url();
  await page.getByRole('button', { name: 'MetaMask app', exact: true }).click();
  await page.evaluate(() => { (window as any).remoteRejected = true; });
  await page.getByRole('button', { name: '2. Connect wallet', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('declined'); expect(page.url()).toBe(original);
  await page.evaluate(() => { (window as any).remotePending = true; });
  await page.getByRole('button', { name: '2. Connect wallet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).resolveRemote)).toBe('function');
  await page.getByRole('button', { name: 'Cancel attempt', exact: true }).click();
  await page.evaluate(() => { const w = window as any; w.remotePending = false; w.resolveRemote(); });
  await expect(page.getByLabel('Wallet review')).toHaveCount(0); expect(fixture.signed).toHaveLength(0);
  await page.getByRole('button', { name: '2. Connect wallet', exact: true }).click();
  await expect(page.getByLabel('Wallet review')).toBeVisible();
  await page.evaluate(() => (window as any).fixtureProviders[1].emit('chainChanged', '0x2'));
  await expect(page.locator('p[role="alert"]')).toContainText('changed');
  expect(page.url()).toBe(original); expect(fixture.signed).toHaveLength(0);
  await page.getByRole('button', { name: '2. Connect wallet', exact: true }).click(); await sign(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(new URL(await callback(page, idp.redirectURI)).searchParams.get('error')).toBe('access_denied');
});
