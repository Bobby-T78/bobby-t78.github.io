const FEED = "https://hickeyb.substack.com/feed";

// Substack sits behind Cloudflare, which serves a 403 "Just a moment" challenge
// to GitHub's datacenter IPs. So we try the direct feed first, then fall back to
// public read-only proxies that fetch from their own IPs and return the raw XML.
const SOURCES = [
  { name: "direct", url: FEED },
  { name: "allorigins", url: "https://api.allorigins.win/raw?url=" + encodeURIComponent(FEED) },
  { name: "corsproxy", url: "https://corsproxy.io/?url=" + encodeURIComponent(FEED) },
  { name: "thingproxy", url: "https://thingproxy.freeboard.io/fetch/" + FEED },
];

const BROWSERISH = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  "Accept": "application/rss+xml, application/xml, text/xml, */*",
};

async function getFeedXml() {
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.url, { headers: BROWSERISH, redirect: "follow" });
      const xml = await res.text();
      const itemCount = (xml.match(/<item[\s>]/g) || []).length;
      console.log(`[${src.name}] status=${res.status} length=${xml.length} items=${itemCount}`);
      if (res.ok && itemCount > 0) {
        console.log("Using source:", src.name);
        return xml;
      }
      console.log(`[${src.name}] first 100:`, JSON.stringify(xml.slice(0, 100)));
    } catch (e) {
      console.log(`[${src.name}] error:`, String(e));
    }
  }
  throw new Error("All feed sources failed to return parseable RSS.");
}

const xml = await getFeedXml();

const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)].map(m => m[1]);

const pick = (block, tag) => {
  const re = new RegExp("<" + tag + "(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/" + tag + ">");
  const m = block.match(re);
  return m ? m[1].trim() : "";
};

const posts = items.slice(0, 3).map(block => ({
  title: pick(block, "title"),
  link: pick(block, "link"),
  pubDate: pick(block, "pubDate"),
  description: pick(block, "description").replace(/<[^>]+>/g, "").slice(0, 160),
}));

const { writeFile } = await import("node:fs/promises");
await writeFile("latest.json", JSON.stringify(posts, null, 2));
console.log("Wrote", posts.length, "posts:", posts.map(p => p.title).join(" | "));
