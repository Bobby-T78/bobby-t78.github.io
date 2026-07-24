const FEED = "https://hickeyb.substack.com/feed";

// Fetch the Substack RSS feed directly. Substack sits behind Cloudflare, which
// blocks requests that do not look like a real browser, so we send full browser
// headers. Runs on the GitHub Actions server: no CORS, no third-party service.
const res = await fetch(FEED, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
});
const xml = await res.text();

console.log("HTTP status:", res.status, "bytes:", xml.length);

if (!res.ok || xml.length < 200) {
  throw new Error("Could not fetch Substack feed. HTTP " + res.status);
}

function pick(block, tag) {
  const m = block.match(new RegExp("<" + tag + ">([\s\S]*?)</" + tag + ">"));
  if (!m) return "";
  return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

if (items.length === 0) {
  throw new Error("Feed contained no items.");
}

const posts = items.slice(0, 3).map((block) => ({
  title: pick(block, "title"),
  link: pick(block, "link"),
  pubDate: pick(block, "pubDate"),
  description: pick(block, "description").replace(/<[^>]+>/g, "").trim().slice(0, 160),
}));

const { writeFile } = await import("node:fs/promises");
await writeFile("latest.json", JSON.stringify(posts, null, 2));
console.log("Wrote", posts.length, "posts:", posts.map((p) => p.title).join(" | "));
