#!/usr/bin/env bash
# cspell:ignore dgst
# Exercise OAuth/OIDC authorization code + PKCE using cURL, without stdin.
# Run against a started demo whose BETTER_AUTH_URL matches BASE_URL:
#   BASE_URL=http://170.106.176.163 bash app/client-test/oauth-token.sh
# Default origin: BASE_URL, then BETTER_AUTH_URL, then http://localhost:3000.
# Supply OAUTH_COOKIE_FILE from wallet sign-in and an existing OAUTH_CLIENT_ID.
# Requires Bash, cURL, jq, OpenSSL, and Node.js. No browser/callback server needed.
# Progress and HTTP diagnostics go to stderr; tokens and UserInfo go to stdout.

set -euo pipefail

log() {
	printf '[oauth] %s\n' "$*" >&2
}

for dependency in curl jq openssl node; do
	if ! command -v "$dependency" >/dev/null 2>&1; then
		log "Missing required command: $dependency"
		exit 1
	fi
done

base_url="${BASE_URL:-${BETTER_AUTH_URL:-http://localhost:3000}}"
base_url="${base_url%/}"
redirect_uri='http://127.0.0.1:8765/callback'
if [[ -z "${OAUTH_CLIENT_ID:-}" || -z "${OAUTH_COOKIE_FILE:-}" || ! -r "${OAUTH_COOKIE_FILE:-}" ]]; then
  log 'SIWE wallet sign-in and an existing configured client are required. Set OAUTH_COOKIE_FILE and OAUTH_CLIENT_ID. Client registration requires wallet-owner authorization.'
  exit 1
fi

# Keep session cookies between requests, and delete temporary files on exit.
# Do not follow redirects: authorize returns JSON so the loopback URL never
# needs to be requested. Never print passwords, cookies, or the PKCE verifier.
work_dir=$(mktemp -d "${TMPDIR:-/tmp}/oauth-token.XXXXXX")
trap 'rm -f "$work_dir/cookies" "$work_dir/response.json"; rmdir "$work_dir"' EXIT

request_json() {
	local method="$1" path="$2" status
	local -a body_args=()
	if [[ $# -eq 3 ]]; then
		body_args=(-H 'Content-Type: application/json' --data-binary "$3")
	fi
	log "$method ${path%%\?*}"
	if status=$(curl --silent --show-error --connect-timeout 10 --max-time 60 \
		--request "$method" "$base_url$path" \
		--cookie "$work_dir/cookies" --cookie-jar "$work_dir/cookies" \
		-H "Origin: $base_url" -H 'Accept: application/json' \
		"${body_args[@]}" --output "$work_dir/response.json" --write-out '%{http_code}'); then
		log "HTTP $status"
	else
		log 'Connection failed. Check BASE_URL and confirm the demo server is running.'
		exit 1
	fi
	if [[ ! "$status" =~ ^2[0-9][0-9]$ ]]; then
		log 'Request failed; response body:'
		cat "$work_dir/response.json" >&2
		printf '\n' >&2
		exit 1
	fi
	if ! jq -e 'type == "object"' "$work_dir/response.json" >/dev/null; then
		log 'Expected a JSON object; response body:'
		cat "$work_dir/response.json" >&2
		printf '\n' >&2
		exit 1
	fi
	cat "$work_dir/response.json"
}

log "Demo origin: $base_url"

# Use the supplied wallet session and configured client; never provision either.
cp -- "$OAUTH_COOKIE_FILE" "$work_dir/cookies"
client_id="$OAUTH_CLIENT_ID"
log "Using configured client: $client_id"

# 3. Generate a fresh PKCE verifier, SHA-256 base64url challenge, and state.
verifier=$(openssl rand -hex 32)
challenge=$(printf '%s' "$verifier" \
	| openssl dgst -sha256 -binary | openssl base64 -A \
	| tr '+/' '-_' | tr -d '=')
state=$(openssl rand -hex 16)
nonce=$(openssl rand -hex 16)
authorization_query=$(jq -nr \
	--arg client_id "$client_id" --arg redirect_uri "$redirect_uri" \
	--arg challenge "$challenge" --arg state "$state" --arg nonce "$nonce" '
	{
		response_type: "code", client_id: $client_id, redirect_uri: $redirect_uri,
		scope: "openid profile email offline_access", code_challenge: $challenge,
		code_challenge_method: "S256", state: $state, nonce: $nonce
	} | to_entries | map((.key | @uri) + "=" + (.value | @uri)) | join("&")
')
log 'Starting authorization with PKCE (S256).'
authorization=$(request_json GET "/api/auth/oauth2/authorize?$authorization_query")

# 4. Complete the same account-selection and consent endpoints used by the UI.
# Forward the server-signed query unchanged via oauth_query on each POST.
# This approves access for the authenticated test account only.
for ((step = 0; step < 5; step++)); do
	redirect_url=$(printf '%s' "$authorization" | jq -er '.url | strings | select(length > 0)')
	redirect_details=$(REDIRECT_URL="$redirect_url" BASE_URL="$base_url" REDIRECT_URI="$redirect_uri" \
		node --input-type=module -e '
			const url = new URL(process.env.REDIRECT_URL, process.env.BASE_URL);
			const callback = new URL(process.env.REDIRECT_URI);
			const isCallback = url.origin === callback.origin && url.pathname === callback.pathname;
			if (!isCallback && url.origin !== new URL(process.env.BASE_URL).origin) {
				throw new Error("Unexpected authorization redirect origin");
			}
			console.log(JSON.stringify({isCallback, path: url.pathname, query: url.search.slice(1), url: url.href}));
		')
	if [[ $(printf '%s' "$redirect_details" | jq -r '.isCallback') == true ]]; then
		callback_url=$(printf '%s' "$redirect_details" | jq -r '.url')
		break
	fi
	path=$(printf '%s' "$redirect_details" | jq -r '.path')
	oauth_query=$(printf '%s' "$redirect_details" | jq -r '.query')
	case "$path" in
		/oauth/select-account)
			log 'Selecting the authenticated account.'
			body=$(jq -n --arg query "$oauth_query" '{selected: true, oauth_query: $query}')
			authorization=$(request_json POST '/api/auth/oauth2/continue' "$body")
			;;
		/oauth/consent)
			log 'Approving requested scopes: openid profile email offline_access'
			body=$(jq -n --arg query "$oauth_query" '{accept: true, oauth_query: $query}')
			authorization=$(request_json POST '/api/auth/oauth2/consent' "$body")
			;;
		*)
			log "Unexpected authorization step: $path"
			printf '%s\n' "$authorization" >&2
			exit 1
			;;
	esac
done
if [[ -z "${callback_url:-}" ]]; then
	log 'Authorization did not reach the callback within five steps.'
	exit 1
fi

# Validate the returned state and decode the one-time code automatically.
code=$(CALLBACK_URL="$callback_url" EXPECTED_STATE="$state" \
	node --input-type=module -e '
		const callback = new URL(process.env.CALLBACK_URL);
		if (callback.searchParams.getAll("state").length !== 1 ||
			callback.searchParams.get("state") !== process.env.EXPECTED_STATE) {
			throw new Error("Callback state does not match this authorization request");
		}
		if (callback.searchParams.has("error")) {
			throw new Error(callback.searchParams.get("error_description") || callback.searchParams.get("error"));
		}
		const codes = callback.searchParams.getAll("code");
		if (codes.length !== 1 || !codes[0]) throw new Error("Missing or duplicate authorization code");
		console.log(codes[0]);
	')
log 'Authorization code received; callback state verified.'

# 5. Exchange the code with the original redirect URI and PKCE verifier.
# Tokens use form encoding, unlike the JSON requests above.
log 'POST /api/auth/oauth2/token'
if status=$(curl --silent --show-error --connect-timeout 10 --max-time 60 \
	"$base_url/api/auth/oauth2/token" \
	-H 'Content-Type: application/x-www-form-urlencoded' \
	--data-urlencode 'grant_type=authorization_code' \
	--data-urlencode "client_id=$client_id" --data-urlencode "redirect_uri=$redirect_uri" \
	--data-urlencode "code=$code" --data-urlencode "code_verifier=$verifier" \
	--output "$work_dir/response.json" --write-out '%{http_code}'); then
	log "HTTP $status"
else
	log 'Token endpoint connection failed.'
	exit 1
fi
if [[ ! "$status" =~ ^2[0-9][0-9]$ ]]; then
	log 'Token exchange failed; response body:'
	cat "$work_dir/response.json" >&2
	printf '\n' >&2
	exit 1
fi
tokens=$(cat "$work_dir/response.json")
access_token=$(printf '%s' "$tokens" | jq -er '.access_token | strings | select(length > 0)')
log "Token type: $(printf '%s' "$tokens" | jq -r '.token_type'); expires in: $(printf '%s' "$tokens" | jq -r '.expires_in') seconds"
printf '\nToken response:\n'
printf '%s\n' "$tokens" | jq .

# 6. Confirm the access token works against OIDC UserInfo. This script does
# not verify or consume the ID token; a real OIDC client must verify it.
log 'GET /api/auth/oauth2/userinfo'
if status=$(curl --silent --show-error --connect-timeout 10 --max-time 60 \
	"$base_url/api/auth/oauth2/userinfo" -H "Authorization: Bearer $access_token" \
	--output "$work_dir/response.json" --write-out '%{http_code}'); then
	log "HTTP $status"
else
	log 'UserInfo endpoint connection failed.'
	exit 1
fi
if [[ ! "$status" =~ ^2[0-9][0-9]$ ]]; then
	log 'UserInfo request failed; response body:'
	cat "$work_dir/response.json" >&2
	printf '\n' >&2
	exit 1
fi
printf '\nUserInfo response:\n'
jq -e 'if .sub | type == "string" then . else error("UserInfo is missing sub") end' "$work_dir/response.json"
log 'OAuth/OIDC flow completed successfully.'
