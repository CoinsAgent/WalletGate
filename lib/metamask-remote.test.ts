import { describe, it, expect, vi } from 'vitest';
import { metamaskRemote, remoteNetworks, type RemoteFactory } from './metamask-remote';
const config = JSON.stringify({ '0x1': 'https://rpc.example.test' });
function fixture() {
  const events = new Map<string, Function>();
  const source = { request: vi.fn(async () => '0x1'), on: vi.fn((e: string, f: Function) => events.set(e, f)), removeListener: vi.fn((e: string) => events.delete(e)) };
  const client = { connect: vi.fn(async () => ({ accounts: ['0x123'], chainId: '0x1' })), disconnect: vi.fn(async () => {}), getProvider: () => source };
  const factory = vi.fn(async () => client) as unknown as RemoteFactory;
  return { client, factory, source, events };
}
describe('MetaMask remote transport boundary', () => {
  it('requires explicit public HTTPS network configuration', () => {
    for (const value of [undefined, '{}', '[]', '{', '{"1":"https://rpc.test"}', '{"0x1":"http://rpc.test"}', '{"0x1":"https://user:secret@rpc.test"}']) expect(() => remoteNetworks(value)).toThrow(/not configured/);
    expect(remoteNetworks(config)).toEqual({ '0x1': 'https://rpc.example.test' });
  });
  it('is lazy, separates connect from signing, forwards events and cleans listeners', async () => {
    const f = fixture(); const remote = metamaskRemote('https://idp.test', config, f.factory);
    expect(f.factory).not.toHaveBeenCalled();
    const changed = vi.fn(); remote.provider.on!('accountsChanged', changed);
    expect(await remote.provider.request({ method: 'eth_requestAccounts' })).toEqual(['0x123']);
    expect(f.client.connect).toHaveBeenCalledWith({ chainIds: ['0x1'] });
    expect(f.source.request).not.toHaveBeenCalled();
    f.events.get('accountsChanged')!(['0x456']); expect(changed).toHaveBeenCalledWith(['0x456']);
    await remote.provider.request({ method: 'personal_sign', params: ['message', 'address'] });
    expect(f.source.request).toHaveBeenCalledWith({ method: 'personal_sign', params: ['message', 'address'] });
    remote.dispose(); expect(f.source.removeListener).toHaveBeenCalledTimes(3); expect(f.client.disconnect).toHaveBeenCalledOnce();
  });
  it('cancel ignores a late connect result, without signing or affecting a fresh attempt', async () => {
    const f = fixture(); let resolve!: (v: any) => void;
    f.client.connect.mockImplementationOnce(() => new Promise(r => resolve = r));
    const remote = metamaskRemote('https://idp.test', config, f.factory);
    const first = remote.provider.request({ method: 'eth_requestAccounts' });
    const failure = expect(first).rejects.toThrow(/cancelled/);
    await vi.waitFor(() => expect(f.client.connect).toHaveBeenCalledOnce()); remote.cancel();
    await failure;
    expect(await remote.provider.request({ method: 'eth_requestAccounts' })).toEqual(['0x123']);
    resolve({ accounts: ['0xBAD'], chainId: '0x1' });
    await Promise.resolve(); await Promise.resolve();
    expect(f.source.request).not.toHaveBeenCalled(); expect(f.client.disconnect).toHaveBeenCalledOnce(); remote.dispose();
  });
  it('timeout and rejected connection allow recovery', async () => {
    const f = fixture(); f.client.connect.mockImplementationOnce(() => new Promise(() => {}));
    const remote = metamaskRemote('https://idp.test', config, f.factory, 10);
    await expect(remote.provider.request({ method: 'eth_requestAccounts' })).rejects.toThrow(/did not respond/);
    f.client.connect.mockRejectedValueOnce({ code: 4001 });
    await expect(remote.provider.request({ method: 'eth_requestAccounts' })).rejects.toEqual({ code: 4001 });
    expect(await remote.provider.request({ method: 'eth_requestAccounts' })).toEqual(['0x123']); remote.dispose();
  });
  it('invalid configuration never loads the SDK', async () => {
    const f = fixture(); const remote = metamaskRemote('https://idp.test', undefined, f.factory);
    await expect(remote.provider.request({ method: 'eth_requestAccounts' })).rejects.toThrow(/not configured/);
    expect(f.factory).not.toHaveBeenCalled(); remote.dispose();
  });
});
