export interface NewsItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sourceColor: string;
}

export const RSS_SOURCES = [
  { key: "g1",   label: "G1 Economia", url: "https://g1.globo.com/rss/g1/economia/",    color: "#E8324A" },
  { key: "info", label: "InfoMoney",   url: "https://www.infomoney.com.br/feed/",         color: "#0057B8" },
];

function extractTag(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i").exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  if (!plain) return "";
  return plain[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchFeed(source: (typeof RSS_SOURCES)[number]): Promise<NewsItem[]> {
  const res = await fetch(source.url);
  if (!res.ok) throw new Error(`Feed ${source.key} indisponível`);
  const xml = await res.text();

  const items: NewsItem[] = [];
  const regex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  let idx = 0;

  while ((match = regex.exec(xml)) !== null && idx < 10) {
    const raw = match[1];
    const title = extractTag(raw, "title");
    if (!title) continue;
    const link = extractTag(raw, "link") || extractTag(raw, "guid");
    const description = stripHtml(extractTag(raw, "description")).slice(0, 200);
    const pubDate = extractTag(raw, "pubDate");
    items.push({
      id: `${source.key}-${idx}`,
      title,
      link,
      description,
      pubDate,
      source: source.label,
      sourceColor: source.color,
    });
    idx++;
  }
  return items;
}

export function tempoRelativo(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d atrás`;
  if (h > 0) return `${h}h atrás`;
  if (min > 0) return `${min}min atrás`;
  return "agora";
}
