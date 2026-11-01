// Replaces only the SDK module inside the disposable Next test server.
// Not copied to or imported by production application code.
export async function createEVMClient(options: unknown) {
  const fixture = (window as any).remoteSDK;
  if (!fixture) throw new Error('Remote SDK test fixture missing');
  fixture.options = options;
  return fixture;
}
