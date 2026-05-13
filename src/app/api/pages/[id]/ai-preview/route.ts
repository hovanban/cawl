/**
 * POST /api/pages/[id]/ai-preview
 * Body: { promptId: string }
 *
 * Runs 3 AI calls (title / content / description) in parallel,
 * returns GeneratedArticle JSON. Does NOT save to DB.
 *
 * If job.translateBeforeRewrite = true:
 *   - Uses existing translatedTitle / translatedContent if present
 *   - Otherwise calls DeepL on-the-fly before passing to Claude
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateArticle } from "@/services/ai";
import { cleanHtml } from "@/lib/cleanHtml";

type Params = { params: { id: string } };

async function deeplTranslate(
  texts: string[],
  apiKey: string,
  targetLang: string,
  tagHandling?: "html",
): Promise<string[]> {
  const baseUrl = apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const body: Record<string, unknown> = { text: texts, target_lang: targetLang.toUpperCase() };
  if (tagHandling) body.tag_handling = tagHandling;

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepL error ${res.status}: ${err}`);
  }

  const data: { translations: { text: string }[] } = await res.json();
  return data.translations.map((t) => t.text);
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { promptId } = await req.json();
    if (!promptId) {
      return NextResponse.json({ error: "promptId is required" }, { status: 400 });
    }

    const [page, prompt] = await Promise.all([
      prisma.crawledPage.findUnique({
        where: { id: params.id },
        include: { job: { select: { translateBeforeRewrite: true } } },
      }),
      prisma.aiPrompt.findUnique({ where: { id: promptId } }),
    ]);

    if (!page)   return NextResponse.json({ error: "Page not found" },   { status: 404 });
    if (!prompt) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

    if (!page.content && !page.title) {
      return NextResponse.json({ error: "Page has no content to process" }, { status: 422 });
    }

    let titleForAI    = page.title                                                   ?? "";
    let contentForAI  = page.content ? cleanHtml(page.content, page.title ?? undefined) : "";
    let commentsForAI = (page as Record<string, unknown>).comments as string | null ?? null;

    if (page.job.translateBeforeRewrite) {
      const alreadyTranslated = page.currentTitle || page.currentContent;

      if (alreadyTranslated) {
        titleForAI    = page.currentTitle                                                            ?? titleForAI;
        contentForAI  = page.currentContent ? cleanHtml(page.currentContent, page.title ?? undefined) : contentForAI;
        commentsForAI = (page as Record<string, unknown>).currentComments as string | null ?? commentsForAI;
      } else {
        const settings = await prisma.appSetting.findMany({
          where: { key: { in: ["deepl_api_key", "deepl_target_lang"] } },
        });
        const settingMap: Record<string, string> = {};
        for (const s of settings) settingMap[s.key] = s.value;

        const apiKey = settingMap["deepl_api_key"];
        if (!apiKey) {
          return NextResponse.json(
            { error: "translateBeforeRewrite bật nhưng DeepL API key chưa cấu hình. Vào Settings để thêm." },
            { status: 400 },
          );
        }
        const targetLang = settingMap["deepl_target_lang"] || "VI";

        const [translatedTitle, translatedContent, translatedComments] = await Promise.all([
          page.title    ? deeplTranslate([page.title],   apiKey, targetLang)           : Promise.resolve([""]),
          page.content  ? deeplTranslate([page.content], apiKey, targetLang, "html")   : Promise.resolve([""]),
          commentsForAI ? deeplTranslate([commentsForAI], apiKey, targetLang)          : Promise.resolve([""]),
        ]);

        titleForAI    = translatedTitle[0]    || titleForAI;
        contentForAI  = translatedContent[0]  || contentForAI;
        commentsForAI = translatedComments[0] || commentsForAI;
      }
    }

    const result = await generateArticle(
      titleForAI,
      contentForAI,
      {
        systemRole:          prompt.systemRole,
        titleTemplate:       prompt.titleTemplate,
        contentTemplate:     prompt.contentTemplate,
        descriptionTemplate: prompt.descriptionTemplate,
        commentTemplate:     (prompt as Record<string, unknown>).commentTemplate as string ?? "",
      },
      commentsForAI ?? undefined,
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ai-preview] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
