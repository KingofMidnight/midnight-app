import dns from "dns";
import net from "net";
import http from "http";
import https from "https";
import type { IncomingMessage } from "http";

// Addresses a server-side fetch must never reach (loopback, private LAN,
// link-local incl. cloud metadata 169.254.169.254, CGNAT, multicast, etc.)
const blockList = new net.BlockList();
[
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
].forEach(([ip, prefix]) => blockList.addSubnet(ip as string, prefix as number, "ipv4"));
// Note: ::ffff:0:0/96 must NOT be added here — BlockList also matches plain IPv4
// against IPv4-mapped IPv6 rules, which would block every IPv4 address.
// Mapped addresses are unwrapped and checked against the IPv4 rules instead.
[
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["100::", 64],
  ["2001:db8::", 32], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
].forEach(([ip, prefix]) => blockList.addSubnet(ip as string, prefix as number, "ipv6"));

export const isBlockedAddress = (ip: string): boolean => {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return isBlockedAddress(mapped[1]);
  const family = net.isIP(ip);
  if (family === 0) return true;
  return blockList.check(ip, family === 6 ? "ipv6" : "ipv4");
};

// Validates every resolved address at connect time (also defeats DNS rebinding,
// since the checked address is the one actually used for the socket).
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, family: options.family as number | undefined }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      return callback(Object.assign(new Error("Destination address is not allowed."), { code: "EBLOCKED" }), "", 0);
    }
    if ((options as dns.LookupAllOptions).all) return (callback as any)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

export class SafeFetchError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// GET a public http(s) URL on the default port. No redirects are followed.
export function safeGet(rawUrl: string, timeoutMs = 10_000): Promise<IncomingMessage> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return Promise.reject(new SafeFetchError("Invalid URL."));
  }
  if (!["http:", "https:"].includes(url.protocol)) return Promise.reject(new SafeFetchError("Only http(s) URLs are allowed."));
  if (url.port !== "") return Promise.reject(new SafeFetchError("Custom ports are not allowed."));
  if (url.username || url.password) return Promise.reject(new SafeFetchError("Credentials in URL are not allowed."));

  const host = url.hostname.replace(/^\[|\]$/g, "");
  // Node skips `lookup` for IP literals, so check those directly
  if (net.isIP(host) && isBlockedAddress(host)) return Promise.reject(new SafeFetchError("Destination address is not allowed."));

  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(
      url,
      { lookup: safeLookup, timeout: timeoutMs, headers: { "User-Agent": "Mozilla/5.0 (compatible; ImageProxy/1.0)" } },
      resolve
    );
    req.on("timeout", () => req.destroy(new SafeFetchError("Upstream timed out.", 504)));
    req.on("error", (err: NodeJS.ErrnoException) =>
      reject(err instanceof SafeFetchError ? err : new SafeFetchError(
        err.code === "EBLOCKED" ? "Destination address is not allowed." : "Failed to fetch image.",
        err.code === "EBLOCKED" ? 400 : 502
      ))
    );
  });
}
