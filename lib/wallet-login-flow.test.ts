import { expect, it, vi } from 'vitest';
import { parseSiweMessage } from 'viem/siwe';
import { hexToString, type Hex } from 'viem';
import { WalletLoginFlow } from './wallet-login-flow';
const address = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf';
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function fixture() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const request = vi.fn(async ({ method }: { method: string; params?: readonly unknown[] }): Promise<unknown> => {
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address];
    if (method === 'eth_chainId') return '0x1';
    if (method === 'personal_sign') return 'signature';
    throw new Error(method);
  });
  const provider = { request,
    on: (event: string, fn: (...args: unknown[]) => void) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event)!.add(fn); },
    removeListener: (event: string, fn: (...args: unknown[]) => void) => { listeners.get(event)?.delete(fn); },
  };
  let nonce = 0;
  const client = { nonce: vi.fn(async () => ({ data: { nonce: `freshnonce${++nonce}` } })), verify: vi.fn(async (_: { message: string; signature: string }): Promise<{data?: unknown; error?: {message: string}}> => ({ data: { redirect: true, url: 'https://idp.example/oauth/consent?sig=original' } })) };
  const changed = vi.fn(); const navigate = vi.fn();
  const flow = new WalletLoginFlow('https://idp.example', client, new URLSearchParams({ client_id: 'rp' }), changed);
  flow.select({ id: 'a', name: 'Wallet A', provider });
  return { flow, request, provider, client, changed, navigate, listeners,
    emit: (event: string) => listeners.get(event)?.forEach(fn => fn()) };
}
it('separates connection from signing, reviews the exact identity/domain, locks double clicks and preserves continuation', async () => {
  const f = fixture(); await f.flow.connect();
  expect(f.flow.state).toMatchObject({ stage: 'review', connection: { address, chainId: 1 } });
  expect(f.client.nonce).not.toHaveBeenCalled(); expect(f.request.mock.calls.map(([a]) => a.method)).toEqual(['eth_requestAccounts', 'eth_chainId']);
  await Promise.all([f.flow.sign(f.navigate), f.flow.sign(f.navigate)]);
  expect(f.client.verify).toHaveBeenCalledTimes(1);
  expect(parseSiweMessage(f.client.verify.mock.calls[0][0].message)).toMatchObject({ address, chainId: 1, domain: 'idp.example', uri: 'https://idp.example/sign-in' });
  const raw = f.request.mock.calls.find(([a]) => a.method === 'personal_sign')![0].params![0] as Hex;
  expect(hexToString(raw)).toBe(f.client.verify.mock.calls[0][0].message);
  expect(f.navigate).toHaveBeenCalledWith('https://idp.example/oauth/consent?sig=original');
  f.flow.dispose();
});
it('freshly connects, obtains a fresh nonce and signs after server failure', async () => {
  const f = fixture(); f.client.verify.mockResolvedValueOnce({ error: { message: 'Server failed' } });
  await f.flow.connect(); await f.flow.sign(f.navigate); expect(f.flow.state.error).toBe('Server failed');
  await f.flow.connect(); await f.flow.sign(f.navigate);
  expect(f.client.nonce).toHaveBeenCalledTimes(2);
  expect(f.client.verify.mock.calls[0][0].message).not.toBe(f.client.verify.mock.calls[1][0].message);
  f.flow.dispose();
});
it.each(['accountsChanged', 'chainChanged', 'disconnect'])('invalidates pending connection on %s and drops late results', async event => {
  const f = fixture(); const pending = deferred<unknown>(); f.request.mockReturnValueOnce(pending.promise);
  const connected = f.flow.connect(); f.emit(event); pending.resolve([address]); await connected;
  expect(f.flow.state.stage).toBe('error'); expect(f.flow.state.connection).toBeUndefined(); expect(f.client.verify).not.toHaveBeenCalled(); f.flow.dispose();
});
it.each(['nonce', 'signature', 'verification'])('drops invalidated asynchronous %s results', async boundary => {
  const f = fixture(); await f.flow.connect(); const pending = deferred<any>();
  if (boundary === 'nonce') f.client.nonce.mockReturnValueOnce(pending.promise);
  if (boundary === 'signature') f.request.mockImplementation(async ({ method }) => method === 'personal_sign' ? pending.promise : method === 'eth_accounts' ? [address] : '0x1');
  if (boundary === 'verification') f.client.verify.mockReturnValueOnce(pending.promise);
  const signing = f.flow.sign(f.navigate);
  await vi.waitFor(() => {
    if (boundary === 'nonce') expect(f.client.nonce).toHaveBeenCalled();
    if (boundary === 'signature') expect(f.request.mock.calls.some(([a]) => a.method === 'personal_sign')).toBe(true);
    if (boundary === 'verification') expect(f.client.verify).toHaveBeenCalled();
  });
  f.emit('accountsChanged'); pending.resolve(boundary === 'nonce' ? { data: { nonce: 'latenonce' } } : boundary === 'signature' ? 'signature' : { data: { redirect: true, url: 'https://idp.example/oauth/consent' } });
  await signing; expect(f.navigate).not.toHaveBeenCalled();
  if (boundary !== 'verification') expect(f.client.verify).not.toHaveBeenCalled();
  f.flow.dispose();
});
it.each(['select', 'dispose', 'cancel', 'replacement'])('invalidates pending signature on %s and removes event listeners', async action => {
  const f = fixture(); await f.flow.connect(); const pending = deferred<unknown>();
  f.request.mockImplementation(async ({ method }) => method === 'personal_sign' ? pending.promise : method === 'eth_accounts' ? [address] : '0x1');
  const signing = f.flow.sign(f.navigate); await vi.waitFor(() => expect(f.request.mock.calls.some(([a]) => a.method === 'personal_sign')).toBe(true));
  if (action === 'select') f.flow.select({ id: 'b', name: 'Other', provider: { request: vi.fn() } });
  if (action === 'dispose') f.flow.dispose();
  if (action === 'cancel') f.flow.reset();
  if (action === 'replacement') f.flow.clear();
  pending.resolve('signature'); await signing;
  expect(f.client.verify).not.toHaveBeenCalled(); expect(f.navigate).not.toHaveBeenCalled();
  f.flow.dispose(); expect([...f.listeners.values()].every(set => set.size === 0)).toBe(true);
});
it.each(['account', 'chain'])('rejects silent %s changes before verification even without events', async what => {
  const f = fixture(); await f.flow.connect();
  let signed = false;
  f.request.mockImplementation(async ({ method }) => {
    if (method === 'personal_sign') { signed = true; return 'signature'; }
    if (method === 'eth_accounts') return signed && what === 'account' ? ['0x0000000000000000000000000000000000000001'] : [address];
    return signed && what === 'chain' ? '0x2' : '0x1';
  });
  await f.flow.sign(f.navigate); expect(f.flow.state.error).toContain('changed'); expect(f.client.verify).not.toHaveBeenCalled(); f.flow.dispose();
});
it.each([4001, 4200, 4900])('connection failure %s is recoverable', async code => {
  const f = fixture(); f.request.mockRejectedValueOnce({ code }); await f.flow.connect(); expect(f.flow.state.stage).toBe('error');
  await f.flow.connect(); expect(f.flow.state.stage).toBe('review'); f.flow.dispose();
});
