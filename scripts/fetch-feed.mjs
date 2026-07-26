const FEED = "https://hickeyb.substack.com/feed";

// Substack sits behind Cloudflare, which blocks direct fetches from the
// GitHub Actions server (HTTP 403). rss2json fetches Substack from its own
// non-blocked servers, so we go through it. Using the API key (when present)
// raises limits and returns a fresher pull than the anonymous cached endpoint.
const KEY = process.env.RSS2JSON_API_KEY;

let apiUrl =
    "https://api.rss2json.com/v1/api.json" +
    "?rss_url=" + encodeURIComponent(FEED) +
    "&count=10" +
    "&_cb=" + Date.now();
if (KEY) apiUrl += "&api_key=" + KEY;

const res = await fetch(apiUrl);
const data = await res.json();

console.log("HTTP status:", res.status);
console.log("API status:", data.status);
console.log("Items returned:", Array.isArray(data.items) ? data.items.length : 0);

// No new/valid items, or a transient rss2json error, is not a failure:
// there is simply nothing to update. Exit cleanly so the workflow stays green.
if (!res.ok || data.status !== "ok" || !Array.isArray(data.items) || data.items.length === 0) {
    console.log("Response message:", data.message || "(none)");
    console.log("No valid feed items to update this run \u2014 skipping.");
    process.exit(0);
}

const posts = data.items.slice(0, 3).map((item) => ({
    title: item.title || "",
    link: item.link || "",
    pubDate: item.pubDate || "",
    description: (item.description || "").replace(/<[^>]+>/g, "").trim().slice(0, 160),
}));

const { writeFile } = await import("node:fs/promises");
await writeFile("latest.json", JSON.stringify(posts, null, 2));
console.log("Wrote", posts.length, "posts:", posts.map((p) => p.title).join(" | "));
