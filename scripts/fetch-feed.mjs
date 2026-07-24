const FEED = "https://hickeyb.substack.com/feed";

// Fetch the Substack RSS feed directly on the GitHub Actions server.
// No browser CORS limit and no third-party service (rss2json) to cache
// or rate-limit us. No API key needed.
const res = await fetch(FEED, {
  headers: { "User-Agent": "bobby-t78-site-feed-fetcher" },
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
