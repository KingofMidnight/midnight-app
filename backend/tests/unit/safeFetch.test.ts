import { describe, expect, it } from "vitest";
import { isBlockedAddress, safeGet } from "../../src/utils/safeFetch";

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "not-an-ip",
  ])("blocks %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  // Regression: an IPv4-mapped IPv6 rule once made BlockList reject every IPv4 address
  it.each(["8.8.8.8", "142.251.157.119", "2001:4860:4860::8888", "::ffff:8.8.8.8"])("allows public %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe("safeGet (rejections that need no network)", () => {
  it.each([
    ["file:///etc/passwd", "Only http(s) URLs are allowed."],
    ["ftp://example.com/a.png", "Only http(s) URLs are allowed."],
    ["https://example.com:8443/a.png", "Custom ports are not allowed."],
    ["https://user:pass@example.com/a.png", "Credentials in URL are not allowed."],
    ["http://127.0.0.1/a.png", "Destination address is not allowed."],
    ["http://[::1]/a.png", "Destination address is not allowed."],
    ["http://2130706433/a.png", "Destination address is not allowed."],
    ["not a url", "Invalid URL."],
  ])("%s", async (url, message) => {
    await expect(safeGet(url)).rejects.toMatchObject({ message, status: 400 });
  });
});
