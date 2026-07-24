const FEED = "https://hickeyb.substack.com/feed";

// rss2json fetches Substack from its own (non-Cloudflare-blocked) servers.
// The public endpoint caches aggressively, so the _cb timestamp forces a fresh
// pull each run -- that's what defeats the stale-cache problem. No API key needed.
const apiUrl =
  "https://api.rss2json.com/v1/api.json" +
  "?rss_url=" + encodeURIComponent(FEED) +
  "&_cb=" + Date.now();

const res = await fetch(apiUrl);
const data = await res.json();

console.log("HTTP status:", res.status);
console.log("API status:", data.status);
console.log("Items returned:", Array.isArray(data.items) ? data.items.length : 0);

if (!res.ok || data.status !== "ok" || !Array.isArray(data.items) || data.items.length === 0) {
  console.log("Response message:", data.message || "(none)");
  throw new Error("rss2json did not return a valid feed.");
}

const posts = data.items.slice(0, 3).map(item => ({
  title: item.title || "",
  link: item.link || "",
  pubDate: item.pubDate || "",
  description: (item.description || "").replace(/<[^>]+>/g, "").trim().slice(0, 160),
}));

const { writeFile } = await import("node:fs/promises");
await writeFile("latest.json", JSON.stringify(posts, null, 2));
console.log("Wrote", posts.length, "posts:", posts.map(p => p.title).join(" | "));
