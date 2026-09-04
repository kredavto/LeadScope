import { describe, expect, it } from "vitest";
import { canonicalizePublicUrl, CrawlError, isPublicAddress, robotsTextAllows } from "./safe-crawl";

describe("crawler safety", () => {
  it("allows a public address", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
  });

  it.each(["127.0.0.1", "10.0.0.5", "169.254.169.254", "::1", "fc00::1", "::ffff:127.0.0.1"])("blocks non-public address %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it("rejects non-http schemes and unsafe ports", () => {
    expect(() => canonicalizePublicUrl("file:///etc/passwd")).toThrow(CrawlError);
    expect(() => canonicalizePublicUrl("https://example.com:3000/")).toThrow(CrawlError);
  });

  it("uses the longest robots rule and prefers Allow on ties", () => {
    const robots = "User-agent: *\nDisallow: /private\nAllow: /private/catalog\n";
    expect(robotsTextAllows(robots, "https://example.com/private/data")).toBe(false);
    expect(robotsTextAllows(robots, "https://example.com/private/catalog/item")).toBe(true);
  });
});
