import * as cheerio from "cheerio";

/**
 * Strip unnecessary attributes and wrapper elements from crawled HTML
 * before sending to translation or AI rewrite.
 * Keeps: src, href, alt, controls — removes everything else.
 */
export function cleanHtml(html: string, title?: string): string {
  const $ = cheerio.load(html, { decodeEntities: false });

  // Remove elements that add no value for translation/AI
  $("script, style, noscript, iframe[src*='ads'], [class*='ads'], [class*='banner']").remove();

  // Unwrap <figure> and <a> wrappers around images — keep the <img> only
  $("figure").each((_, el) => {
    const fig = $(el);
    const img = fig.find("img");
    const caption = fig.find("figcaption").text().trim();
    if (img.length) {
      const src = img.attr("src") ?? "";
      const alt = img.attr("alt") || caption || title || "";
      fig.replaceWith(`<img src="${src}" alt="${alt}">`);
    } else {
      fig.replaceWith(fig.html() ?? "");
    }
  });

  // Unwrap <a> tags that only wrap an <img>
  $("a").each((_, el) => {
    const a = $(el);
    if (a.children().length === 1 && a.children("img").length === 1) {
      a.replaceWith(a.html() ?? "");
    }
  });

  // On all remaining elements: strip every attribute except essential ones
  const KEEP_ATTRS: Record<string, string[]> = {
    img:    ["src", "alt"],
    a:      ["href"],
    video:  ["src", "controls"],
    source: ["src"],
    td:     ["colspan", "rowspan"],
    th:     ["colspan", "rowspan"],
  };

  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const tag = el.name;
    const allowed = KEEP_ATTRS[tag] ?? [];
    const attribs = el.attribs ?? {};
    for (const attr of Object.keys(attribs)) {
      if (!allowed.includes(attr)) {
        $(el).removeAttr(attr);
      }
    }
  });

  // Gán title cho img còn alt rỗng sau khi strip
  if (title) {
    $("img").each((_, el) => {
      const img = $(el);
      if (!img.attr("alt")) img.attr("alt", title);
    });
  }

  // Collapse multiple blank lines
  const body = $("body").html() ?? html;
  return body.replace(/(\s*\n){3,}/g, "\n\n").trim();
}
