import path from "path";
import fs from "fs/promises";
import { supabaseAdmin } from "../config/supabase";
import { createError } from "../middleware/errorHandler";
import { sanitizeChapterHtml } from "../utils/validation";

const SITE_NAME = process.env.SITE_NAME ?? "Midnight Platform";
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3001"
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Covers are fetched server-side by the EPUB generator, so only allow our own
// public Supabase Storage URLs (prevents SSRF via a creator-controlled URL).
function safeCoverUrl(url: string | null): string | undefined {
  if (!url || !process.env.SUPABASE_URL) return undefined;
  try {
    const cover = new URL(url);
    const storage = new URL(process.env.SUPABASE_URL);
    const ok =
      cover.protocol === "https:" &&
      cover.host === storage.host &&
      cover.pathname.startsWith("/storage/v1/object/public/");
    return ok ? cover.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function generateEpub(storyId: string): Promise<string> {
  const { data: story, error: storyErr } = await supabaseAdmin
    .from("stories")
    .select("id, title, author_name, description, cover_image_url")
    .eq("id", storyId)
    .eq("review_status", "approved")
    .single();

  if (storyErr || !story) {
    throw createError("Story not found or not approved.", 404);
  }

  const { data: chapters, error: chapErr } = await supabaseAdmin
    .from("chapters")
    .select("chapter_number, title, content")
    .eq("story_id", storyId)
    .eq("review_status", "approved")
    .order("chapter_number");

  if (chapErr || !chapters?.length) {
    throw createError("No approved chapters found.", 404);
  }

  const { default: epub } = await import("epub-gen-memory");

  const chapterContent = chapters.map((ch) => ({
    title: `Chapter ${ch.chapter_number}${ch.title ? `: ${ch.title}` : ""}`,
    content: sanitizeChapterHtml(ch.content ?? "") || "<p>No content.</p>",
  }));

  const epubBuffer: Buffer = await epub(
    {
      title: story.title,
      author: story.author_name ?? "Unknown Author",
      publisher: SITE_NAME,
      description: story.description ?? "",
      cover: safeCoverUrl(story.cover_image_url),
    },
    chapterContent
  );

  const exportDir = path.join(UPLOAD_DIR, "exports");
  await fs.mkdir(exportDir, { recursive: true });

  const safeTitle = story.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `${safeTitle}_${storyId.slice(0, 8)}.epub`;
  const filePath = path.join(exportDir, filename);

  await fs.writeFile(filePath, epubBuffer);

  return filePath;
}

export async function generateChapterPdf(chapterId: string): Promise<string> {
  const { data: chapter, error: chapErr } = await supabaseAdmin
    .from("chapters")
    .select("id, chapter_number, title, content, story_id, stories!inner(title, author_name)")
    .eq("id", chapterId)
    .eq("review_status", "approved")
    .single();

  if (chapErr || !chapter) throw createError("Chapter not found or not approved.", 404);

  const story = chapter.stories as any;

  const html = buildChapterHtml({
    storyTitle: escapeHtml(story?.title ?? "Unknown Story"),
    authorName: escapeHtml(story?.author_name ?? "Unknown Author"),
    chapterNumber: chapter.chapter_number,
    chapterTitle: escapeHtml(chapter.title),
    content: sanitizeChapterHtml(chapter.content ?? "") || "<p>No content.</p>",
    siteUrl: escapeHtml(SITE_URL),
    siteName: escapeHtml(SITE_NAME),
  });

  const puppeteer = await import("puppeteer");
  // Only disable Chromium's sandbox where it can't run (e.g. root in Docker)
  // "shell" = the lightweight chrome-headless-shell build, which is all PDF rendering needs.
  // Install it with: npx puppeteer browsers install chrome-headless-shell
  const browser = await puppeteer.default.launch({
    headless: "shell",
    args: process.env.PUPPETEER_NO_SANDBOX === "true" ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
  });

  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      if (r.url().startsWith("data:") || r.url() === "about:blank") r.continue();
      else r.abort();
    });
    await page.setContent(html, { waitUntil: "load" });

    const exportDir = path.join(UPLOAD_DIR, "exports");
    await fs.mkdir(exportDir, { recursive: true });

    const filename = `chapter_${chapter.chapter_number}_${chapterId.slice(0, 8)}.pdf`;
    const filePath = path.join(exportDir, filename);

    await page.pdf({
      path: filePath,
      format: "A4",
      margin: { top: "60px", right: "60px", bottom: "60px", left: "60px" },
      printBackground: true,
    });

    return filePath;
  } finally {
    await browser.close();
  }
}

interface HtmlOptions {
  storyTitle: string;
  authorName: string;
  chapterNumber: number;
  chapterTitle: string;
  content: string;
  siteUrl: string;
  siteName: string;
}

function buildChapterHtml(opts: HtmlOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${opts.storyTitle} – Chapter ${opts.chapterNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #1a1a1a;
      background: #fff;
    }
    .header {
      border-bottom: 1px solid #ddd;
      padding-bottom: 16px;
      margin-bottom: 32px;
    }
    .story-title { font-size: 10pt; color: #666; margin-bottom: 4px; }
    .chapter-title { font-size: 18pt; font-weight: bold; }
    .author { font-size: 10pt; color: #888; margin-top: 4px; }
    .content { max-width: 100%; }
    .content p { margin-bottom: 1em; }
    .content h1, .content h2, .content h3 { margin: 1.5em 0 0.5em; }
    .footer {
      margin-top: 48px;
      padding-top: 12px;
      border-top: 1px solid #eee;
      font-size: 8pt;
      color: #aaa;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="story-title">${opts.storyTitle}</div>
    <div class="chapter-title">Chapter ${opts.chapterNumber}: ${opts.chapterTitle}</div>
    <div class="author">by ${opts.authorName}</div>
  </div>
  <div class="content">${opts.content}</div>
  <div class="footer">
    Generated by ${opts.siteName} — ${opts.siteUrl}
  </div>
</body>
</html>`;
}


