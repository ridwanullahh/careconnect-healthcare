// Bismillah Ar-Rahman Ar-Raheem.
// Backend news aggregation — fetches real RSS feeds and stores articles.
import type { StorageAdapter } from '@careconnect/db';

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

/** Parse a basic RSS 2.0 / Atom feed XML into items (no external deps). */
function parseRSS(xml: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi;
  const matches = xml.match(itemRegex) || [];
  for (const block of matches) {
    const get = (tag: string): string => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };
    const title = get('title');
    const link = get('link') || get('id');
    const description = get('description') || get('summary');
    const pubDate = get('pubDate') || get('published') || get('updated');
    if (title && link) {
      items.push({ title, link, description, pubDate, source: sourceName });
    }
  }
  return items;
}

/** Fetch and parse a single RSS feed. */
async function fetchFeed(url: string, sourceName: string): Promise<RSSItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CareConnect-NewsBot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml, sourceName);
  } catch {
    return [];
  }
}

/**
 * Aggregate news from configured sources. For each active news_source record,
 * fetch the RSS feed, parse items, and insert new articles into news_articles.
 * Returns the count of newly inserted articles.
 */
export async function aggregateNews(db: StorageAdapter): Promise<{ fetched: number; inserted: number }> {
  const sources = (await db.find('news_sources', { is_active: true })) as any[];
  if (sources.length === 0) {
    return { fetched: 0, inserted: 0 };
  }
  let fetched = 0;
  let inserted = 0;
  for (const source of sources) {
    if (!source.rss_url) continue;
    const items = await fetchFeed(source.rss_url, source.name);
    fetched += items.length;
    for (const item of items) {
      // Dedup by source_url.
      const existing = await db.find('news_articles', { source_url: item.link });
      if (existing.length > 0) continue;
      await db.insert('news_articles', {
        title: item.title,
        excerpt: item.description.substring(0, 280),
        content: item.description,
        source: item.source,
        source_url: item.link,
        image_url: '',
        published_at: item.pubDate || new Date().toISOString(),
        category: source.category || 'general',
        tags: [],
        status: 'published',
        admin_approved: true,
        featured: false,
        views: 0,
        likes: 0,
        author_name: item.source,
        created_at: new Date().toISOString(),
      });
      inserted++;
    }
    // Update last_fetched.
    await db.update('news_sources', source.id, { last_fetched: new Date().toISOString() });
  }
  return { fetched, inserted };
}
