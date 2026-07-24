const FEED = "https://hickeyb.substack.com/feed";

const xml = await fetch(FEED, { headers: { "User-Agent": "gh-actions-feed" } })
  .then(r => r.text());

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);

const pick = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
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
