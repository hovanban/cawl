/**
 * crawler.ts
 * Two-phase web crawling engine:
 *   Phase 1 — collectArticles(): crawl listing page(s), extract article links/titles/thumbnails
 *   Phase 2 — crawlArticleDetail(): fetch each article, extract content/images/video
 *
 * Also keeps legacy single-page crawl helpers (previewCrawl).
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import pLimit from "p-limit";
import robotsParser from "robots-parser";
import { prisma } from "@/lib/prisma";
import { cleanHtml } from "@/lib/cleanHtml";

const USER_AGENT = "CawlBot/1.0 (+https://github.com/cawl)";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelectorConfig {
  // Listing page selectors
  detailLinkSelector?: string;  // CSS selector for article links
  titleSelector?: string;       // CSS selector for article title (on listing)
  imageListSelector?: string;   // CSS selector for thumbnail (on listing)

  // Detail page selectors
  contentSelector?: string;
  removeElementSelector?: string;
  imageDetailSelector?: string;
  videoSelector?: string;
}

interface ApiConfig {
  token?: string;       // Bearer token
  baseUrl?: string;     // e.g. "https://www.vothuat.vn" — used to build article URLs from slugs
  articleUrlField?: string; // JSON field with article URL (e.g. "remotePostUrl")
}

interface CrawlConfig {
  jobId: string;
  runId: string;
  startUrl: string;
  maxDepth: number;
  limitPosts: number;
  rateLimit: number;
  concurrency: number;
  authorEmail?: string;
  martialArt?: string;
  selectors: SelectorConfig;
  api?: ApiConfig;
}

interface ArticleRef {
  url: string;
  title: string | null;
  thumbnail: string | null;
}

interface ArticleDetail {
  content: string;
  images: string[];
  videoUrl: string | null;
  title: string | null;
  statusCode: number | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// URL utilities
// ---------------------------------------------------------------------------

// Normalises a URL to a canonical form for deduplication
export function normalizeUrl(url: URL): string {
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.searchParams.sort();
  ["utm_source","utm_medium","utm_campaign","utm_term","utm_content",
   "ref","source","fbclid","gclid","mc_cid","mc_eid"].forEach(p => url.searchParams.delete(p));
  return url.toString();
}

// Resolves and normalises a URL relative to a base, returns null if invalid
export function resolveUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return normalizeUrl(url);
  } catch {
    return null;
  }
}

// Resolve relative to same origin only
function resolveUrlSameOrigin(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    const baseOrigin = new URL(base).origin;
    if (url.origin !== baseOrigin) return null;
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return normalizeUrl(url);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Image utilities
// ---------------------------------------------------------------------------

const IMG_ATTRS = ["src","data-src","data-original","data-lazy","data-lazy-src","data-url","data-echo"];

function resolveImageSrc(src: string | undefined, baseUrl: string): string | null {
  if (!src || src.startsWith("data:")) return null;
  try { return new URL(src, baseUrl).toString(); } catch { return null; }
}

function extractImages($: cheerio.CheerioAPI, scope: cheerio.Cheerio<AnyNode>, baseUrl: string): string[] {
  const images: string[] = [];

  scope.find("img").each((_, el) => {
    let src: string | undefined;
    for (const attr of IMG_ATTRS) {
      src = $(el).attr(attr);
      if (src && !src.startsWith("data:")) break;
    }
    const resolved = resolveImageSrc(src, baseUrl);
    if (resolved && !images.includes(resolved)) images.push(resolved);
  });

  // <picture><source srcset="url 1x, url2 2x"> — pick highest res (last entry)
  scope.find("source[srcset], img[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset") ?? "";
    const parts = srcset.split(",").map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
    const best = parts[parts.length - 1];
    const resolved = resolveImageSrc(best, baseUrl);
    if (resolved && !images.includes(resolved)) images.push(resolved);
  });

  return images;
}

// Extract a single image URL from an element using lazy-load attributes
function extractSingleImage($: cheerio.CheerioAPI, el: AnyNode, baseUrl: string): string | null {
  // Try img inside the element first
  const img = $(el).is("img") ? $(el) : $(el).find("img").first();
  if (img.length) {
    for (const attr of IMG_ATTRS) {
      const src = img.attr(attr);
      const resolved = resolveImageSrc(src, baseUrl);
      if (resolved) return resolved;
    }
    // srcset — pick highest res
    const srcset = img.attr("srcset") ?? "";
    if (srcset) {
      const parts = srcset.split(",").map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
      const best = parts[parts.length - 1];
      const resolved = resolveImageSrc(best, baseUrl);
      if (resolved) return resolved;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url: string): Promise<{ data: string; status: number }> {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: { "User-Agent": USER_AGENT },
    maxContentLength: 5 * 1024 * 1024,
    responseType: "text",
  });
  return { data: response.data as string, status: response.status };
}

async function fetchRobots(origin: string): Promise<ReturnType<typeof robotsParser>> {
  try {
    const { data } = await axios.get(`${origin}/robots.txt`, {
      timeout: 5000,
      headers: { "User-Agent": USER_AGENT },
    });
    return robotsParser(`${origin}/robots.txt`, data);
  } catch {
    return robotsParser(`${origin}/robots.txt`, "");
  }
}

// ---------------------------------------------------------------------------
// API mode — collect articles from a JSON API (e.g. Strapi)
// ---------------------------------------------------------------------------

// Safely read a nested field path like "thumbnail.url" from an object
function getField(obj: Record<string, unknown>, path: string): string | null {
  const val = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
  return typeof val === "string" ? val : null;
}

async function collectArticlesFromApi(
  startUrl: string,
  maxDepth: number,
  limitPosts: number,
  api: ApiConfig,
  rateLimit: number,
): Promise<ArticleRef[]> {
  const articles: ArticleRef[] = [];
  const seen = new Set<string>();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "application/json" };
  if (api.token) headers["Authorization"] = `Bearer ${api.token}`;

  for (let page = 1; page <= Math.max(maxDepth, 1); page++) {
    if (articles.length >= limitPosts) break;

    // Build paginated URL — append pagination params (Strapi style)
    const pageUrl = new URL(startUrl);
    pageUrl.searchParams.set("pagination[page]", String(page));
    pageUrl.searchParams.set("pagination[pageSize]", String(Math.min(limitPosts, 25)));

    try {
      await sleep(rateLimit);
      const res = await axios.get(pageUrl.toString(), { headers, timeout: 15000 });
      const json = res.data as Record<string, unknown>;

      // Support Strapi v4/v5 format: { data: [...], meta: { pagination } }
      // and plain array format: [...]
      const items: Record<string, unknown>[] = Array.isArray(json)
        ? (json as Record<string, unknown>[])
        : Array.isArray(json.data)
        ? (json.data as Record<string, unknown>[])
        : [];

      if (items.length === 0) break; // no more pages

      for (const item of items) {
        if (articles.length >= limitPosts) break;

        // Build article URL
        let articleUrl: string | null = null;
        if (api.articleUrlField) {
          articleUrl = getField(item, api.articleUrlField);
        }
        if (!articleUrl && item.slug && api.baseUrl) {
          articleUrl = `${api.baseUrl.replace(/\/$/, "")}/${item.slug}`;
        }
        if (!articleUrl) continue;

        // Normalize and deduplicate
        try { articleUrl = normalizeUrl(new URL(articleUrl)); } catch { continue; }
        if (seen.has(articleUrl)) continue;
        seen.add(articleUrl);

        // Extract thumbnail — check common Strapi paths
        const thumbnail =
          getField(item, "thumbnail.url") ||
          getField(item, "thumbnail.data.attributes.url") ||
          getField(item, "image.url") ||
          getField(item, "featuredImage.url") ||
          null;

        // Prepend CDN base to relative thumbnail URLs
        const thumbResolved = thumbnail
          ? (thumbnail.startsWith("http") ? thumbnail : (api.baseUrl ?? "") + thumbnail)
          : null;

        articles.push({
          url: articleUrl,
          title: getField(item, "title") || getField(item, "name"),
          thumbnail: thumbResolved,
          // Carry the full HTML content from API so Phase 2 can skip the detail fetch
          _apiContent: (typeof item.content === "string" ? item.content : null) ?? null,
          _apiExcerpt: getField(item, "excerpt"),
        } as ArticleRef & { _apiContent: string | null; _apiExcerpt: string | null });
      }

      // Strapi pagination — stop if we've reached the last page
      const meta = json.meta as { pagination?: { pageCount?: number } } | undefined;
      if (meta?.pagination?.pageCount && page >= meta.pagination.pageCount) break;
    } catch (err) {
      console.error(`[api] page ${page} error:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  return articles;
}

// ---------------------------------------------------------------------------
// Phase 1 — collect article references from listing page(s)
// ---------------------------------------------------------------------------

async function collectArticles(
  startUrl: string,
  maxDepth: number,       // max listing pages to paginate
  limitPosts: number,
  sel: SelectorConfig,
  rateLimit: number,
): Promise<ArticleRef[]> {
  const articles: ArticleRef[] = [];
  const seen = new Set<string>();
  let lastRequestAt = 0;

  for (let page = 1; page <= Math.max(maxDepth, 1); page++) {
    if (articles.length >= limitPosts) break;

    // Build paginated URL
    let pageUrl = startUrl;
    if (page > 1) {
      try {
        const u = new URL(startUrl);
        // Try ?page=N style first; many CMS use this
        u.searchParams.set("page", String(page));
        pageUrl = u.toString();
      } catch {
        pageUrl = startUrl;
      }
    }

    // Rate limit
    const now = Date.now();
    const elapsed = now - lastRequestAt;
    if (elapsed < rateLimit) await sleep(rateLimit - elapsed);
    lastRequestAt = Date.now();

    let html: string;
    try {
      const res = await fetchHtml(pageUrl);
      html = res.data;
    } catch {
      // Stop pagination if page fails
      break;
    }

    const $ = cheerio.load(html);

    // --- Extract links ---
    const linkEls = sel.detailLinkSelector
      ? $(sel.detailLinkSelector).toArray()
      : $("a[href]").toArray();

    // --- Extract titles (by index) ---
    const titleEls = sel.titleSelector
      ? $(sel.titleSelector).toArray()
      : [];

    // --- Extract thumbnails (by index) ---
    const thumbEls = sel.imageListSelector
      ? $(sel.imageListSelector).toArray()
      : [];

    const pageArticles: ArticleRef[] = [];

    linkEls.forEach((el, idx) => {
      const href = $(el).attr("href");
      if (!href) return;

      const resolved = resolveUrl(href, pageUrl);
      if (!resolved || seen.has(resolved)) return;
      seen.add(resolved);

      // Title: from titleSelector at same index, or link text
      let title: string | null = null;
      if (titleEls[idx]) {
        title = $(titleEls[idx]).text().replace(/\s+/g, " ").trim() || null;
      }
      if (!title) {
        title = $(el).text().replace(/\s+/g, " ").trim() || null;
      }

      // Thumbnail
      let thumbnail: string | null = null;
      if (thumbEls[idx]) {
        thumbnail = extractSingleImage($, thumbEls[idx], pageUrl);
      }

      pageArticles.push({ url: resolved, title, thumbnail });
    });

    if (pageArticles.length === 0) break; // no more results on this page

    for (const a of pageArticles) {
      if (articles.length >= limitPosts) break;
      articles.push(a);
    }
  }

  return articles;
}

// ---------------------------------------------------------------------------
// Phase 2 — crawl article detail page
// ---------------------------------------------------------------------------

async function crawlArticleDetail(
  url: string,
  sel: SelectorConfig,
): Promise<ArticleDetail> {
  let html: string;
  let statusCode: number | null = null;

  try {
    const res = await fetchHtml(url);
    html = res.data;
    statusCode = res.status;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (axios.isAxiosError(err)) statusCode = err.response?.status ?? null;
    return { content: "", images: [], videoUrl: null, title: null, statusCode, error: msg };
  }

  const $ = cheerio.load(html);

  // Page title fallback
  const pageTitle = $("title").text().trim() || null;

  // Remove noise
  $("script, style, noscript").remove();
  if (sel.removeElementSelector) {
    $(sel.removeElementSelector).remove();
  }

  // Content area
  let contentEl = sel.contentSelector
    ? $(sel.contentSelector).first()
    : $("article, [class*='article'], [class*='content'], [class*='detail'], main").first();

  if (!contentEl.length) contentEl = $("body");

  const content = contentEl.html()?.trim() ?? "";

  // Images
  const imageScope = sel.imageDetailSelector
    ? $(sel.imageDetailSelector)
    : contentEl;
  const images = extractImages($, imageScope, url);

  // Video
  let videoUrl: string | null = null;
  const videoSel = sel.videoSelector ?? "video source, video[src], iframe[src*='youtube'], iframe[src*='youtu.be']";
  const videoEl = $(videoSel).first();
  if (videoEl.length) {
    const raw = videoEl.attr("src") ?? videoEl.attr("data-src");
    if (raw) videoUrl = raw.startsWith("http") ? raw : new URL(raw, url).href;
  }

  return { content, images, videoUrl, title: pageTitle, statusCode, error: null };
}

// ---------------------------------------------------------------------------
// Main runCrawl — orchestrates both phases
// ---------------------------------------------------------------------------

export async function runCrawl(config: CrawlConfig): Promise<void> {
  const {
    jobId,
    runId,
    startUrl,
    maxDepth,
    limitPosts,
    rateLimit,
    concurrency,
    authorEmail,
    martialArt,
    selectors,
    api,
  } = config;

  // Mark job as running
  await prisma.crawlJob.update({
    where: { id: jobId },
    data: { status: "RUNNING" },
  });

  // ── Phase 1: collect article references ──────────────────────────────────
  // API mode: fetch from JSON endpoint; HTML mode: scrape listing pages
  let articles: ArticleRef[] = [];
  try {
    if (api?.token || api?.baseUrl) {
      articles = await collectArticlesFromApi(startUrl, maxDepth, limitPosts, api, rateLimit);
    } else {
      articles = await collectArticles(startUrl, maxDepth, limitPosts, selectors, rateLimit);
    }
  } catch (err) {
    console.error(`[crawler] Phase 1 failed for job ${jobId}:`, err);
  }

  // Update pagesFound with number of articles discovered
  await prisma.crawlRun.update({
    where: { id: runId },
    data: { pagesFound: articles.length },
  });

  if (articles.length === 0) {
    await prisma.crawlRun.update({
      where: { id: runId },
      data: { status: "COMPLETED", finishedAt: new Date() },
    });
    await prisma.crawlJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED" },
    });
    return;
  }

  // ── Phase 2: crawl each article ──────────────────────────────────────────
  const limit = pLimit(concurrency);
  let lastRequestAt = 0;
  let errors = 0;

  // Robots.txt — only needed for HTML mode; cache per origin
  const robotsCache = new Map<string, ReturnType<typeof robotsParser>>();
  async function getRobots(url: string) {
    const origin = new URL(url).origin;
    if (!robotsCache.has(origin)) {
      robotsCache.set(origin, await fetchRobots(origin));
    }
    return robotsCache.get(origin)!;
  }

  const tasks = articles.map((article) =>
    limit(async () => {
      // API mode: article already has content from Phase 1 — skip HTML fetch & robots check
      const apiArticle = article as ArticleRef & { _apiContent?: string | null; _apiExcerpt?: string | null };
      let detail: ArticleDetail;
      if (api && apiArticle._apiContent !== undefined) {
        detail = {
          content: apiArticle._apiContent || apiArticle._apiExcerpt || "",
          images: [],
          videoUrl: null,
          title: article.title,
          statusCode: 200,
          error: null,
        };
      } else {
        // Rate limit
        const now = Date.now();
        const elapsed = now - lastRequestAt;
        if (elapsed < rateLimit) await sleep(rateLimit - elapsed);
        lastRequestAt = Date.now();

        // Robots.txt check (per-origin cache)
        const robots = await getRobots(article.url);
        if (!robots.isAllowed(article.url, USER_AGENT)) {
          await prisma.crawlRun.update({
            where: { id: runId },
            data: { pagesSkipped: { increment: 1 } },
          });
          return;
        }

        detail = await crawlArticleDetail(article.url, selectors);
      }

      // Use title from listing if detail page didn't provide one
      const title = article.title ?? detail.title;

      if (detail.error) errors++;

      // Upsert to DB
      try {
        await prisma.crawledPage.upsert({
          where: { jobId_url: { jobId, url: article.url } },
          create: {
            url: article.url,
            depth: 0,
            title,
            thumbnail: article.thumbnail,
            content: detail.content || null,
            images: detail.images.length ? JSON.stringify(detail.images) : null,
            videoUrl: detail.videoUrl,
            statusCode: detail.statusCode,
            error: detail.error,
            authorEmail: authorEmail ?? null,
            martialArt:  martialArt  ?? null,
            currentTitle:   title                                              || null,
            currentContent: detail.content ? cleanHtml(detail.content, title ?? undefined) : null,
            jobId,
            runId,
          },
          update: {
            title,
            thumbnail: article.thumbnail,
            content: detail.content || null,
            images: detail.images.length ? JSON.stringify(detail.images) : null,
            videoUrl: detail.videoUrl,
            statusCode: detail.statusCode,
            error: detail.error,
            authorEmail: authorEmail ?? null,
            martialArt:  martialArt  ?? null,
            currentTitle:   title                                              || null,
            currentContent: detail.content ? cleanHtml(detail.content, title ?? undefined) : null,
            crawledAt: new Date(),
            runId,
          },
        });
      } catch {
        // Unique constraint race — safe to ignore
      }

      // Update run counters
      await prisma.crawlRun.update({
        where: { id: runId },
        data: {
          pagesProcessed: { increment: 1 },
          errors: detail.error ? { increment: 1 } : undefined,
        },
      });
    })
  );

  await Promise.all(tasks);

  // Finalise
  await prisma.crawlRun.update({
    where: { id: runId },
    data: { status: "COMPLETED", finishedAt: new Date() },
  });

  await prisma.crawlJob.update({
    where: { id: jobId },
    data: { status: "COMPLETED" },
  });
}

// ---------------------------------------------------------------------------
// Preview crawl — single page fetch, no DB writes
// ---------------------------------------------------------------------------

export async function previewCrawl(url: string) {
  let html: string;
  let status: number;

  try {
    const res = await fetchHtml(url);
    html = res.data;
    status = res.status;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { url, statusCode: null, title: null, content: null, images: [], links: [], error: msg };
  }

  const $ = cheerio.load(html);
  const title = $("title").text().trim() || null;

  $("script, style, noscript").remove();

  const contentEl = $("article, [class*='article'], [class*='content'], [class*='detail'], main").first()
    || $("body");
  const content = contentEl.html()?.trim() ?? null;

  const images = extractImages($, contentEl.length ? contentEl : $("body"), url).slice(0, 20);

  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const resolved = resolveUrlSameOrigin(href, url);
    if (resolved) links.push(resolved);
  });

  return {
    url,
    statusCode: status,
    title,
    content,
    images,
    links: links.slice(0, 20),
  };
}
