const FEED = "https://hickeyb.substack.com/feed";

const res = await fetch(FEED, {
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; feed-bot/1.0)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
  },
  redirect: "follow",
});

const xml = await res.text();

// Diagnostics so the Action log tells us exactly what came back.
console.log("HTTP status:", res.status);
console.log("Body length:", xml.length);
console.log("First 120 chars:", JSON.stringify(xml.slice(0, 120)));

if (!res.ok) {
  throw new Error("Feed fetch failed with status " + res.status);
}

// Tolerant item matcher: handles <item> with or without attributes.
const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)].map(m => m[1]);
console.log("Items found:", items.length);

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
console.log("Wrote", posts.length, "posts");
