import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const MAX_REDIRECTS = 4;
const PAGE_BYTES = 1_000_000;
const ROBOTS_BYTES = 256_000;

export class CrawlError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 422) {
    super(message);
    this.name = "CrawlError";
    this.code = code;
    this.status = status;
  }
}

const blockedIpv4 = new BlockList();
const blockedIpv6 = new BlockList();
[
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
].forEach(([address, prefix]) => blockedIpv4.addSubnet(String(address), Number(prefix), "ipv4"));
[
  ["::", 128], ["::1", 128], ["::ffff:0:0", 96], ["64:ff9b::", 96], ["100::", 64],
  ["2001::", 32], ["2001:2::", 48], ["2001:db8::", 32], ["2002::", 16],
  ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
].forEach(([address, prefix]) => blockedIpv6.addSubnet(String(address), Number(prefix), "ipv6"));

export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (!family) return false;
  return family === 4 ? !blockedIpv4.check(address, "ipv4") : !blockedIpv6.check(address, "ipv6");
}

export function canonicalizePublicUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new CrawlError("INVALID_URL", "Укажите абсолютный URL страницы.");
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new CrawlError("INVALID_SCHEME", "Разрешены только HTTP(S)-адреса.");
  if (url.username || url.password) throw new CrawlError("URL_CREDENTIALS", "URL со встроенными учётными данными запрещён.");
  if (url.port && !((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))) {
    throw new CrawlError("PORT_BLOCKED", "Разрешены только стандартные порты HTTP и HTTPS.");
  }
  url.hash = "";
  return url;
}

async function resolvePublic(hostname: string) {
  const literal = hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(literal)
    ? [literal]
    : (await lookup(hostname, { all: true, verbatim: true }).catch(() => [])).map((item) => item.address);
  if (!addresses.length) throw new CrawlError("DNS_FAILED", "Домен не удалось разрешить через DNS.");
  if (addresses.some((address) => !isPublicAddress(address))) throw new CrawlError("SSRF_BLOCKED", "Адрес ведёт во внутреннюю или служебную сеть и заблокирован.", 403);
  return [...new Set(addresses)].sort();
}

async function readLimited(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new CrawlError("RESPONSE_TOO_LARGE", "Размер ответа превышает безопасный лимит.");
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new CrawlError("RESPONSE_TOO_LARGE", "Размер ответа превышает безопасный лимит.");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

function decodeBody(body: Uint8Array, contentType: string) {
  const charset = contentType.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1] ?? "utf-8";
  try { return new TextDecoder(charset).decode(body); }
  catch { return new TextDecoder("utf-8").decode(body); }
}

type FetchOptions = {
  allowedHostname: string;
  userAgent: string;
  kind: "page" | "robots";
};

async function safeFetch(rawUrl: string, options: FetchOptions) {
  let current = canonicalizePublicUrl(rawUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    if (current.hostname !== options.allowedHostname) throw new CrawlError("HOST_MISMATCH", "Переход на другой домен заблокирован.", 403);
    const before = await resolvePublic(current.hostname);
    let response: Response;
    try {
      response = await fetch(current, {
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(8_000),
        headers: { "User-Agent": options.userAgent, Accept: options.kind === "page" ? "text/html,application/xhtml+xml" : "text/plain,*/*;q=0.1" },
      });
    } catch (error) {
      if (error instanceof CrawlError) throw error;
      throw new CrawlError("FETCH_FAILED", "Сайт не ответил вовремя или отклонил соединение.", 502);
    }
    const after = await resolvePublic(current.hostname);
    if (before.join(",") !== after.join(",")) throw new CrawlError("DNS_REBINDING", "DNS-адрес изменился во время запроса; сканирование остановлено.", 403);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new CrawlError("INVALID_REDIRECT", "Сайт вернул перенаправление без адреса.");
      current = canonicalizePublicUrl(new URL(location, current).toString());
      continue;
    }
    if ([401, 403].includes(response.status)) throw new CrawlError("ACCESS_DENIED", "Сайт запретил автоматический доступ.", 403);
    if (options.kind === "robots" && response.status === 404) return { url: current.toString(), status: 404, text: "", contentHash: "" };
    if (!response.ok) throw new CrawlError("HTTP_ERROR", `Сайт вернул HTTP ${response.status}.`, 502);
    const contentType = response.headers.get("content-type")?.toLocaleLowerCase() ?? "";
    const allowed = options.kind === "page"
      ? contentType.startsWith("text/html") || contentType.startsWith("application/xhtml+xml")
      : contentType.startsWith("text/plain") || contentType.startsWith("text/html") || !contentType;
    if (!allowed) throw new CrawlError("CONTENT_TYPE_BLOCKED", "Ответ не является HTML-страницей.");
    const body = await readLimited(response, options.kind === "page" ? PAGE_BYTES : ROBOTS_BYTES);
    const text = decodeBody(body, contentType);
    if (options.kind === "page" && /(?:g-recaptcha|hcaptcha|captcha-container|captcha__)/i.test(text.slice(0, 150_000))) {
      throw new CrawlError("CAPTCHA_DETECTED", "Обнаружена CAPTCHA. Обход защиты запрещён.", 403);
    }
    return { url: current.toString(), status: response.status, text, contentHash: createHash("sha256").update(body).digest("hex") };
  }
  throw new CrawlError("TOO_MANY_REDIRECTS", "Сайт выполнил слишком много перенаправлений.");
}

type RobotsRule = { allow: boolean; pattern: string };

function ruleMatches(path: string, pattern: string) {
  const endAnchored = pattern.endsWith("$");
  const source = pattern.replace(/\$$/, "").split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${source}${endAnchored ? "$" : ""}`).test(path);
}

export function robotsTextAllows(text: string, targetUrl: string, botName = "LeadScopeBot") {
  type Group = { agents: string[]; rules: RobotsRule[] };
  const groups: Group[] = [];
  let current: Group | null = null;
  let rulesStarted = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLocaleLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!current || rulesStarted) { current = { agents: [], rules: [] }; groups.push(current); rulesStarted = false; }
      current.agents.push(value.toLocaleLowerCase());
    } else if (current && (field === "allow" || field === "disallow")) {
      rulesStarted = true;
      if (value) current.rules.push({ allow: field === "allow", pattern: value });
    }
  }
  const lowerBot = botName.toLocaleLowerCase();
  const exact = groups.filter((group) => group.agents.some((agent) => lowerBot.includes(agent) && agent !== "*"));
  const applicable = exact.length ? exact : groups.filter((group) => group.agents.includes("*"));
  const path = `${new URL(targetUrl).pathname}${new URL(targetUrl).search}`;
  const matching = applicable.flatMap((group) => group.rules).filter((rule) => ruleMatches(path, rule.pattern));
  matching.sort((left, right) => right.pattern.length - left.pattern.length || Number(right.allow) - Number(left.allow));
  return matching[0]?.allow ?? true;
}

export async function loadRobotsPolicy(startUrl: string, userAgent: string) {
  const start = canonicalizePublicUrl(startUrl);
  const robotsUrl = `${start.protocol}//${start.host}/robots.txt`;
  try {
    const result = await safeFetch(robotsUrl, { allowedHostname: start.hostname, userAgent, kind: "robots" });
    return { allows: (url: string) => result.status === 404 || robotsTextAllows(result.text, url), url: result.url };
  } catch (error) {
    if (error instanceof CrawlError && error.code === "ACCESS_DENIED") return { allows: () => false, url: robotsUrl };
    if (error instanceof CrawlError) throw error;
    throw new CrawlError("ROBOTS_UNAVAILABLE", "Не удалось безопасно проверить robots.txt; сканирование остановлено.", 502);
  }
}

export async function fetchHtmlPage(url: string, allowedHostname: string, userAgent: string) {
  return safeFetch(url, { allowedHostname, userAgent, kind: "page" });
}
