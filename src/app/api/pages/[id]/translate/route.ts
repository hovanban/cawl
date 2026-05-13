/**
 * POST /api/pages/[id]/translate
 * Translate title + content via DeepL, save to translatedTitle / translatedContent.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanHtml } from "@/lib/cleanHtml";

type Params = { params: { id: string } };

async function deeplTranslate(
  texts: string[],
  apiKey: string,
  targetLang: string,
  tagHandling?: "html"
): Promise<string[]> {
  const baseUrl = apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const body: Record<string, unknown> = {
    text: texts,
    target_lang: targetLang.toUpperCase(),
  };
  if (tagHandling) body.tag_handling = tagHandling;

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepL error ${res.status}: ${err}`);
  }

  const data: { translations: { text: string }[] } = await res.json();
  return data.translations.map((t) => t.text);
}

export async function POST(_req: NextRequest, { params }: Params) {
  // Load page
  const page = await prisma.crawledPage.findUnique({ where: { id: params.id } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Load settings
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["deepl_api_key", "deepl_target_lang"] } },
  });
  const settingMap: Record<string, string> = {};
  for (const s of settings) settingMap[s.key] = s.value;

  const apiKey = settingMap["deepl_api_key"];
  if (!apiKey) {
    return NextResponse.json(
      { error: "DeepL API key chưa được cấu hình. Vào Settings để thêm." },
      { status: 400 }
    );
  }
  const targetLang = settingMap["deepl_target_lang"] || "VI";

  try {
    const hasTitle    = !!page.title;
    const hasContent  = !!page.content;
    const hasComments = !!page.comments;

    let translatedTitle: string | undefined;
    let translatedContent: string | undefined;
    let translatedComments: string | undefined;

    if (hasTitle) {
      const [result] = await deeplTranslate([page.title!], apiKey, targetLang);
      translatedTitle = result;
    }

    // Translate content as HTML (preserves tags) — clean first to reduce tokens
    if (hasContent) {
      const [result] = await deeplTranslate([cleanHtml(page.content!, page.title ?? undefined)], apiKey, targetLang, "html");
      translatedContent = result;
    }

    // Translate comments as plain text
    if (hasComments) {
      const [result] = await deeplTranslate([page.comments!], apiKey, targetLang);
      translatedComments = result;
    }

    const updated = await prisma.crawledPage.update({
      where: { id: params.id },
      data: {
        ...(translatedTitle    !== undefined && { currentTitle:    translatedTitle    }),
        ...(translatedContent  !== undefined && { currentContent:  translatedContent  }),
        ...(translatedComments !== undefined && { currentComments: translatedComments }),
      },
      select: { id: true, currentTitle: true, currentContent: true, currentComments: true },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
