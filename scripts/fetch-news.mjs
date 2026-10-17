// Fetches headlines from CNN and The Star (Malaysia) and writes news.json.
// Runs hourly in GitHub Actions; the app reads news.json from the same site.
import { writeFileSync } from "node:fs";

const SOURCES = [
  { key: "cnn", name: "CNN", feeds: [
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

async function readFeed(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (CarpeDiem news reader)" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  const xml = await r.text();
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([it]) => {
    let title = strip(tag(it, "title"));
    const google = url.includes("news.google.com");
    if (google) title = title.replace(/\s+-\s+[^-]+$/, "");
    return {
      title,
      brief: google ? "" : brief(tag(it, "description"), title),
      link: strip(tag(it, "link")) || strip(tag(it, "guid")),
      published: new Date(strip(tag(it, "pubDate")) || Date.now()).toISOString()
    };
  }).filter(i => i.title && i.link);
}

const out = { updated: new Date().toISOString(), sources: {} };
for (const s of SOURCES) {
  let items = [], used = "";
  for (const f of s.feeds) {
    try {
      const all = await readFeed(f);
      const fresh = all.filter(i => Date.now() - Date.parse(i.published) < FRESH_MS);
      if (fresh.length >= 3) { items = fresh; used = f; break; }
      console.log(`${s.name}: ${f} has ${fresh.length} fresh of ${all.length}, trying next`);
    } catch (e) { console.log(`${s.name}: ${e.message}`); }
  }
  const seen = new Set();
  items = items.sort((a, b) => b.published.localeCompare(a.published))
    .filter(i => !seen.has(i.title) && seen.add(i.title)).slice(0, PER_SOURCE);
  out.sources[s.key] = { name: s.name, feed: used, items };
  console.log(`${s.name}: ${items.length} items from ${used || "nowhere"}`);
}
writeFileSync("news.json", JSON.stringify(out, null, 1) + "\n");
