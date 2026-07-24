const FEED = "https://hickeyb.substack.com/feed";
const API_KEY = process.env.RSS2JSON_API_KEY;

if (!API_KEY) {
  throw new Error("Missing RSS2JSON_API_KEY environment variable.");
}

// rss2json fetches Substack from its own servers (not Cloudflare-blocked like
// GitHub runner IPs are). Using our private API key gives a cache we control,
// and the cache-buster forces a fresh pull so it never goes stale.
const apiUrl =
  "https://api.rss2json.com/v1/api.json" +
  "?rss_url=" + encodeURIComponent(FEED) +
  "&api_key=" + API_KEY +
  "&count=10" +
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
