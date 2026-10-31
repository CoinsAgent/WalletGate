# OAuth/OIDC CLI walkthrough

Sign in with Ethereum at `/sign-in`. Password signup and login are disabled.
Anonymous client registration is disabled; client registration requires wallet-owner
authorization. Obtain a configured public native client ID from the operator with
redirect URI `http://127.0.0.1:8765/callback` and authorization-code/refresh grants.
This sprint does not approve wallet-owner management or legacy-session policy.

Use a disposable local wallet session, saved to a Netscape-format cookie file,
and run:

```bash
BASE_URL=http://localhost:3000 \
OAUTH_COOKIE_FILE=/path/to/local-wallet-session.cookies \
OAUTH_CLIENT_ID=your-configured-client \
bash app/client-test/oauth-token.sh
```

Requires Bash, cURL, jq, OpenSSL and Node.js. The script uses the existing session
and client, performs S256 PKCE authorization and consent, then prints tokens and
UserInfo. It does not create accounts or clients. Protect and delete the session
cookie file and token output after local testing. Failed authorization requires
returning to the wallet sign-in flow; it never falls back to another login method.
