import { isIP } from "node:net";
import { getAddress } from "viem";

// ERC-4361 ABNF, not parse-and-regenerate: signatures cover the original bytes.
// No chain allowlist, issued-at freshness window, or mandatory expiration policy.
const unreserved = "[A-Za-z0-9._~-]";
const pct = "%[A-Fa-f0-9]{2}";
const subdelims = "[!$&'()*+,;=]";
const pchar = `(?:${unreserved}|${pct}|${subdelims}|[:@])`;
const regname = `(?:${unreserved}|${pct}|${subdelims})*`;
const authority = new RegExp(`^(?:(?:${unreserved}|${pct}|${subdelims}|:)*@)?(\\[[^\\]]+\\]|${regname})(?::[0-9]*)?$`);
const requestId = new RegExp(`^(?:${pchar})*$`);
const statement = /^[A-Za-z0-9._~:/?#[\]@!$&'()*+,;= %\-]*$/;

function validAuthority(value: string) {
  const match = authority.exec(value);
  if (!match) return false;
  const host = match[1];
  if (!host.startsWith("[")) return true;
  const literal = host.slice(1, -1);
  return isIP(literal) === 6 || /^v[0-9a-f]+\.[A-Za-z0-9._~!$&'()*+,;=:\-]+$/i.test(literal);
}
function validURI(value: string) {
  const match = /^([A-Za-z][A-Za-z0-9+.-]*):([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/.exec(value);
  if (!match) return false;
  let path = match[2];
  if (path.startsWith("//")) {
    const end = path.indexOf("/", 2);
    const host = end < 0 ? path.slice(2) : path.slice(2, end);
    if (!validAuthority(host)) return false;
    path = end < 0 ? "" : path.slice(end);
  }
  return new RegExp(`^(?:${pchar}|/)*$`).test(path) &&
    [match[3], match[4]].every(part => part === undefined || new RegExp(`^(?:${pchar}|[/?])*$`).test(part));
}

/** Parse RFC 3339 explicitly: Date.parse alone normalizes impossible dates. */
function timestamp(value: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/.exec(value);
  if (!m) return;
  const [, y, mon, day, hour, minute, second, fraction, zone] = m;
  const year = Number(y), month = Number(mon), d = Number(day), h = Number(hour), min = Number(minute), sec = Number(second);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || d < 1 || d > days[month - 1] || h > 23 || min > 59 || sec > 60) return;
  let offset = 0;
  if (!/z/i.test(zone)) {
    const zh = Number(zone.slice(1, 3)), zm = Number(zone.slice(4));
    if (zh > 23 || zm > 59) return;
    offset = (zh * 60 + zm) * (zone[0] === "+" ? 1 : -1);
  }
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, d);
  date.setUTCHours(h, min, Math.min(sec, 59), 0);
  // RFC 3339 permits leap-second representation; preserve its ordering.
  return date.getTime() - offset * 60_000 + (sec === 60 ? 1000 : 0) + Number(fraction ?? 0) * 1000;
}

/** Full consumption, ordered singleton fields, and signed validity bounds. */
export function validSIWEMessage(message: string, address: string, publicURL: string, now = Date.now()): boolean {
  try {
    const origin = new URL(publicURL);
    const lines = message.split("\n");
    let i = 0;
    const header = /^(?:([A-Za-z][A-Za-z0-9+.-]*):\/\/)?([^\s]+) wants you to sign in with your Ethereum account:$/.exec(lines[i++]);
    if (!header || !validAuthority(header[2]) || header[2].toLowerCase() !== origin.host.toLowerCase()) return false;
    if (header[1] && `${header[1].toLowerCase()}:` !== origin.protocol) return false;
    const wallet = lines[i++];
    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet) || getAddress(wallet) !== getAddress(address)) return false;
    if (lines[i++] !== "") return false;
    if (lines[i] !== "") {
      if (!statement.test(lines[i++])) return false;
    }
    if (lines[i++] !== "") return false;
    const field = (name: string): string | undefined => {
      const prefix = `${name}: `;
      if (!lines[i]?.startsWith(prefix)) return;
      return lines[i++].slice(prefix.length);
    };
    const uri = field("URI");
    if (!uri || !validURI(uri) || new URL(uri).origin !== origin.origin) return false;
    if (field("Version") !== "1") return false;
    const chain = field("Chain ID");
    if (!chain || !/^[0-9]+$/.test(chain) || Number(chain) <= 0 || !Number.isInteger(Number(chain))) return false;
    const nonce = field("Nonce");
    if (!nonce || !/^[a-zA-Z0-9]{8,250}$/.test(nonce)) return false;
    const issued = field("Issued At");
    if (issued === undefined || timestamp(issued) === undefined) return false;
    for (const name of ["Expiration Time", "Not Before"]) {
      const value = field(name);
      if (value === undefined) continue;
      const time = timestamp(value);
      if (time === undefined || (name === "Expiration Time" ? now >= time : now < time)) return false;
    }
    const id = field("Request ID");
    if (id !== undefined && !requestId.test(id)) return false;
    if (lines[i] === "Resources:") {
      i++;
      while (i < lines.length) {
        const resource = lines[i++];
        if (!resource.startsWith("- ") || !validURI(resource.slice(2))) return false;
      }
    }
    return i === lines.length;
  } catch {
    return false;
  }
}
