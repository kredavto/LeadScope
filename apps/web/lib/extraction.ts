export type ExtractedOffer = {
  offer: string;
  company: string;
  price: string;
  evidence: string;
  confidence: number;
  extractor: "deterministic-v1" | "ai-assisted-v1";
};

export function deduplicateOffers(items: ExtractedOffer[]) {
  const merged = new Map<string, ExtractedOffer>();
  for (const item of items) {
    const normalizedTitle = item.offer.toLocaleLowerCase().replaceAll("ё", "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const key = `${item.company.toLocaleLowerCase()}|${normalizedTitle}`;
    const current = merged.get(key);
    if (!current || item.confidence > current.confidence) merged.set(key, item);
  }
  return [...merged.values()];
}

type JsonObject = Record<string, unknown>;

const PRICE_PATTERN = /(?:от\s+)?\d(?:[\d\s\u00a0.,]*\d)?\s*(?:₽|руб(?:\.|лей)?|RUB|USD|\$|EUR|€|%)/iu;
const FREE_PATTERN = /(?:бесплатно|free)/iu;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
const PHONE_PATTERN = /(?<!\d)(?:\+?\d[\s()\-.]*){9,15}(?!\d)/g;

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: "&", apos: "'", gt: ">", hellip: "…", laquo: "«", lt: "<",
    nbsp: " ", ndash: "–", mdash: "—", quot: '"', raquo: "»",
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return named[code.toLocaleLowerCase()] ?? entity;
  });
}

function cleanText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function asText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  const object = asObject(value);
  return object ? asText(object.name) : "";
}

function schemaTypes(value: unknown) {
  return (Array.isArray(value) ? value : [value]).map(asText).map((item) => item.toLocaleLowerCase()).filter(Boolean);
}

function formatCurrency(currency: string) {
  const normalized = currency.toUpperCase();
  if (normalized === "RUB") return "₽";
  if (normalized === "USD") return "$";
  if (normalized === "EUR") return "€";
  return currency;
}

function jsonLdPrice(node: JsonObject) {
  const specification = asObject(node.priceSpecification);
  const currency = asText(node.priceCurrency) || asText(specification?.priceCurrency);
  const price = asText(node.price) || asText(specification?.price);
  const low = asText(node.lowPrice) || asText(specification?.minPrice);
  const high = asText(node.highPrice) || asText(specification?.maxPrice);
  const amount = price || (low && high ? `${low}–${high}` : low || high);
  if (!amount) return "Не указана";
  return `${amount}${currency ? ` ${formatCurrency(currency)}` : ""}`;
}

function scriptBodies(html: string) {
  const bodies: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\btype\s*=\s*["']?application\/ld\+json\b/i.test(match[1])) bodies.push(match[2].trim());
  }
  return bodies;
}

export function extractDeterministicOffers(html: string, pageUrl: string, company: string): ExtractedOffer[] {
  const offers: ExtractedOffer[] = [];
  const seen = new Set<string>();

  function add(offer: string, price: string, confidence: number) {
    const safeOffer = cleanText(offer).slice(0, 180);
    const safePrice = cleanText(price).slice(0, 80) || "Не указана";
    if (safeOffer.length < 2) return;
    const key = safeOffer.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    offers.push({ offer: safeOffer, company, price: safePrice, evidence: pageUrl, confidence, extractor: "deterministic-v1" });
  }

  function walk(value: unknown, inheritedName = "") {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, inheritedName));
      return;
    }
    const node = asObject(value);
    if (!node) return;
    const types = schemaTypes(node["@type"]);
    const ownName = asText(node.name) || inheritedName;
    if (types.some((type) => type === "offer" || type === "aggregateoffer")) {
      add(asText(node.itemOffered) || inheritedName || ownName, jsonLdPrice(node), 94);
    } else if (types.some((type) => ["product", "service", "financialproduct", "loanorcredit"].includes(type)) && !node.offers) {
      add(ownName, jsonLdPrice(node), 88);
    }
    for (const child of Object.values(node)) walk(child, ownName);
  }

  for (const body of scriptBodies(html)) {
    try {
      walk(JSON.parse(body.replace(/^\s*<!--|-->\s*$/g, "")));
    } catch {
      // Invalid JSON-LD is ignored; visible text can still be processed below.
    }
  }

  const withoutUnsafe = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  const title = cleanText(withoutUnsafe.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? "Предложение");
  const blocks = withoutUnsafe
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:h[1-6]|p|li|article|section|div|td|tr)\s*>/gi, "\n")
    .split(/\n+/)
    .map(cleanText)
    .filter((line) => line.length >= 3 && line.length <= 320);

  for (const block of blocks) {
    const price = block.match(PRICE_PATTERN)?.[0] ?? block.match(FREE_PATTERN)?.[0];
    if (!price) continue;
    const beforePrice = block.slice(0, Math.max(0, block.indexOf(price))).replace(/(?:цена|стоимость)\s*[:—-]?\s*$/iu, "").trim();
    const candidate = beforePrice.split(/[|•·]/).at(-1)?.trim() || title;
    if (/^(?:более|до|от|скидка|получите|и\s+получите|проведение)$/iu.test(candidate)) continue;
    if (price.includes("%") && candidate.length < 12) continue;
    add(candidate.length >= 2 ? candidate : title, price, 68);
  }
  return offers.slice(0, 20);
}

export function extractionSnippet(html: string) {
  const withoutUnsafe = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:h[1-6]|p|li|article|section|div|td|tr)\s*>/gi, "\n");
  const lines = withoutUnsafe.split(/\n+/).map(cleanText).filter((line) => {
    if (line.length < 3 || line.length > 500) return false;
    return PRICE_PATTERN.test(line) || FREE_PATTERN.test(line) || /тариф|услуг|продукт|кредит|рассроч|стоим|цен|offer|service|product|plan/iu.test(line);
  });
  return Array.from(new Set(lines))
    .join("\n")
    .replace(EMAIL_PATTERN, "[email удалён]")
    .replace(PHONE_PATTERN, "[телефон удалён]")
    .slice(0, 12_000);
}

export function extractInternalLinks(html: string, baseUrl: string) {
  const base = new URL(baseUrl);
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gi)) {
    const href = decodeHtml(match[1] ?? match[2] ?? "").trim();
    if (!href || href.startsWith("#") || /^(?:mailto|tel|javascript|data):/i.test(href)) continue;
    try {
      const candidate = new URL(href, base);
      candidate.hash = "";
      if (candidate.hostname !== base.hostname || !["http:", "https:"].includes(candidate.protocol)) continue;
      if (/\.(?:pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?)$/i.test(candidate.pathname)) continue;
      links.add(candidate.toString());
    } catch {
      // Broken links are not crawl candidates.
    }
  }
  const preferred = /price|prices|pricing|tariff|service|services|product|products|credit|loan|цен|тариф|услуг|продукт|кредит/iu;
  const denied = /login|signin|account|cart|checkout|privacy|policy|terms|agreement|личн|корзин|вход/iu;
  return [...links].filter((url) => !denied.test(new URL(url).pathname)).sort((left, right) => Number(preferred.test(right)) - Number(preferred.test(left)));
}
