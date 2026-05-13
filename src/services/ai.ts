/**
 * ai.ts
 * Anthropic Claude integration.
 *
 * Two modes:
 *  1. processWithAI()   — simple prompt → plain text (used during crawl)
 *  2. generateArticle() — 3 separate AI calls: title / content / description
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

async function getClient(): Promise<Anthropic> {
  const row = await prisma.appSetting.findUnique({ where: { key: "anthropic_api_key" } });
  const apiKey = row?.value?.trim() || process.env.ANTHROPIC_API_KEY;
  return new Anthropic({ apiKey });
}

const MAX_TOKENS         = parseInt(process.env.AI_MAX_TOKENS    ?? "500");
const ARTICLE_MAX_TOKENS = parseInt(process.env.AI_ARTICLE_TOKENS ?? "4096");
const CONTENT_CHAR_LIMIT = parseInt(process.env.AI_CONTENT_LIMIT  ?? "6000");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitize(text: string = ""): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function retry<T>(fn: () => Promise<T>, times = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

async function callClaude(systemRole: string, userPrompt: string, maxTokens = ARTICLE_MAX_TOKENS): Promise<string> {
  const client = await getClient();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemRole || undefined,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected AI response type");
  return block.text.trim();
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AiPromptConfig {
  systemRole:          string;
  titleTemplate:       string;
  contentTemplate:     string;
  descriptionTemplate: string;
  commentTemplate:     string;
}

export interface GeneratedArticle {
  title:           string;
  content:         string;
  description:     string;
  comments:        string;
  // raw AI outputs per field (for display)
  titleRaw:        string;
  contentRaw:      string;
  descriptionRaw:  string;
  commentsRaw:     string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Simple prompt → plain text (used during crawl job for aiResult field).
 */
export async function processWithAI(content: string, prompt: string): Promise<string> {
  const client = await getClient();
  const truncated = content.slice(0, CONTENT_CHAR_LIMIT);
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: `${prompt}\n\n---\nPage content:\n${truncated}` }],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected AI response type");
  return block.text;
}

/**
 * Generate a rewritten article using 3 separate prompts.
 * Runs title / content / description in parallel.
 * Falls back to original value if a template is empty.
 */
export async function generateArticle(
  title: string,
  content: string,
  promptConfig: AiPromptConfig,
  comments?: string,
): Promise<GeneratedArticle> {
  const { systemRole, titleTemplate, contentTemplate, descriptionTemplate, commentTemplate } = promptConfig;

  const safeTitle    = sanitize(title);
  const safeContent  = sanitize(content).slice(0, CONTENT_CHAR_LIMIT);
  const shortDetails = safeContent.slice(0, 500);
  const safeComments = comments ? sanitize(comments).slice(0, CONTENT_CHAR_LIMIT) : "";

  const runTitle = titleTemplate.trim()
    ? () => retry(() => callClaude(systemRole, titleTemplate.replace(/\{blog_title\}/g, safeTitle)), 3)
    : () => Promise.resolve(safeTitle);

  const runContent = contentTemplate.trim()
    ? () => retry(() => callClaude(systemRole, contentTemplate.replace(/\{blog_content\}/g, safeContent), ARTICLE_MAX_TOKENS), 3)
    : () => Promise.resolve(content);

  const runDescription = descriptionTemplate.trim()
    ? () => retry(() => callClaude(systemRole, descriptionTemplate.replace(/\{short_details\}/g, shortDetails), 300), 3)
    : () => Promise.resolve("");

  const runComments = (commentTemplate.trim() && safeComments)
    ? () => retry(() => callClaude(systemRole, commentTemplate.replace(/\{blog_comments\}/g, safeComments), ARTICLE_MAX_TOKENS), 3)
    : () => Promise.resolve(safeComments);

  const [titleRaw, contentRaw, descriptionRaw, commentsRaw] = await Promise.all([
    runTitle(),
    runContent(),
    runDescription(),
    runComments(),
  ]);

  return {
    title:       titleRaw   || safeTitle,
    content:     contentRaw || content,
    description: descriptionRaw,
    comments:    commentsRaw,
    titleRaw,
    contentRaw,
    descriptionRaw,
    commentsRaw,
  };
}

// ---------------------------------------------------------------------------
// Batch processing (used by crawler)
// ---------------------------------------------------------------------------

interface PageForAI {
  id: string;
  content: string;
}

export async function batchProcessPages(
  pages: PageForAI[],
  prompt: string,
  concurrency = 3,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const { default: pLimit } = await import("p-limit");
  const limit = pLimit(concurrency);

  await Promise.all(
    pages.map((page) =>
      limit(async () => {
        try {
          const result = await processWithAI(page.content, prompt);
          results.set(page.id, result);
        } catch (err) {
          console.error(`AI processing failed for page ${page.id}:`, err);
        }
      }),
    ),
  );

  return results;
}
