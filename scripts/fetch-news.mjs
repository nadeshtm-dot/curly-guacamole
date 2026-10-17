// Fetches headlines from CNN and The Star (Malaysia) and writes news.json.
// Runs hourly in GitHub Actions; the app reads news.json from the same site.
import { writeFileSync } from "node:fs";

const SOURCES = [
  { key: "cnn", name: "CNN", feeds: [
    "https://lite.cnn.com/",
    "http://rss.cnn.com/rss/edition.rss",
    "http://rss.cnn.com/rss/edition_world.rss",
    "https://news.google.com/rss/search?q=site:cnn.com+when:1d&hl=en-US&gl=US&ceid=US:en"
  ] },
  { key: "thestar", name: "The Star", feeds: [
    "https://www.thestar.com.my/rss/News/Nation",
    "https://www.thestar.com.my/rss/News",
    "https://news.google.com/rss/search?q=site:thestar.com.my+when:1d&hl=en-MY&gl=MY&ceid=MY:en"
  ] }
];
const PER_SOURCE = 8;
const FRESH_MS = 48 * 3600 * 1000;

const decode = s => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");
const strip = s => decode(decode(s || "")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i")); return m ? m[1] : ""; };

function brief(desc, title) {
  let d = strip(desc);
  if (!d || d.toLowerCase().startsWith(title.toLowerCase().slice(0, 30))) return "";
  const first = d.match(/^.{20,220}?[.!?](\s|$)/);
  d = first ? first[0].trim() : d;
  return d.length > 220 ? d.slice(0, 217).replace(/\s+\S*$/, "") + "…" : d;
}

const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" };
const get = async url => {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
};

// CNN's RSS feeds stopped updating, so read the plain-text site instead.
async function readCnnLite(url) {
  const html = await get(url);
  const today = new Date(), seen = new Set();
  const links = [...html.matchAll(/<a[^>]+href="(\/\d{4}\/\d{2}\/\d{2}\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map(([, href, t]) => ({ href, title: strip(t) })).filter(l => l.title && !seen.has(l.href) && seen.add(l.href)).slice(0, PER_SOURCE);
  return Promise.all(links.map(async (l, n) => {
    const [, y, m, d] = l.href.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
    let b = "";
    try {
      const page = await get("https://lite.cnn.com" + l.href);
      const paras = [...page.matchAll(/<p[^>]*class="[^"]*paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/g)].map(x => strip(x[1])).filter(t => t.length > 40);
      b = brief(paras[0] || "", l.title);
    } catch {}
    const day = new Date(`${y}-${m}-${d}T12:00:00Z`);
    // lite.cnn.com lists newest first; keep that order with minute offsets.
    const published = day.toDateString() === today.toDateString() ? new Date(Date.now() - n * 60000) : day;
    return { title: l.title, brief: b, link: "https://www.cnn.com" + l.href, published: published.toISOString() };
  }));
}

async function pageBrief(link, title) {
  try {
    const html = await get(link);
    const m = html.match(/<meta[^>]+(?:property|name)="(?:og:description|description)"[^>]+content="([^"]*)"/i)
      || html.match(/<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="(?:og:description|description)"/i);
    return m ? brief(m[1], title) : "";
  } catch { return ""; }
}

async function readFeed(url) {
  if (url.includes("lite.cnn.com")) return readCnnLite(url);
  const xml = await get(url);
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([it]) => {
    let title = strip(tag(it, "title"));
    const google = url.includes("news.google.com");
    if (google) title = title.replace(/\?\S*$/, "").replace(/\s+-\s+[^-]+$/, "");
    return {
      title,
      brief: google ? "" : brief(tag(it, "description"), title),
      link: strip(tag(it, "link")) || strip(tag(it, "guid")),
      published: tag(it, "pubDate") ? new Date(strip(tag(it, "pubDate"))).toISOString() : null
    };
  }).filter(i => i.title && i.link && !/^Topic:/i.test(i.title));
}

const out = { updated: new Date().toISOString(), sources: {}, log: [] };
const log = m => { console.log(m); out.log.push(m); };
for (const s of SOURCES) {
  let items = [], used = "";
  for (const f of s.feeds) {
    try {
      const all = await readFeed(f);
      const fresh = all.filter(i => i.published && Date.now() - Date.parse(i.published) < FRESH_MS);
      if (fresh.length >= 3) { items = fresh; used = f; break; }
      log(`${s.name}: ${f} has ${fresh.length} fresh of ${all.length}, trying next`);
    } catch (e) { log(`${s.name}: ${e.message}`); }
  }
  const seen = new Set();
  items = items.sort((a, b) => b.published.localeCompare(a.published))
    .filter(i => !seen.has(i.title) && seen.add(i.title)).slice(0, PER_SOURCE);
  await Promise.all(items.map(async i => { if (!i.brief && !i.link.includes("news.google.com")) i.brief = await pageBrief(i.link, i.title); }));
  out.sources[s.key] = { name: s.name, feed: used, items };
  log(`${s.name}: ${items.length} items from ${used || "nowhere"}`);
}
writeFileSync("news.json", JSON.stringify(out, null, 1) + "\n");
