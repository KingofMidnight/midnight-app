import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { reportLimiter } from "../middleware/rateLimiter.js";
import { supabaseAdmin } from "../config/supabase.js";
import { createError } from "../middleware/errorHandler.js";
import { assertNotTimedOut } from "../utils/moderation.js";
import { asyncHandler, parse, sendData } from "../utils/http.js";

const router = Router();

const optionalUuid = z.string().uuid().optional().nullable();

const CreateReportSchema = z
  .object({
    reportType: z.enum(["content", "user", "dmca"], { errorMap: () => ({ message: "Invalid report type." }) }),
    storyId: optionalUuid,
    chapterId: optionalUuid,
    episodeId: optionalUuid,
    commentId: optionalUuid,
    reportedUserId: optionalUuid,
    reason: z.string().trim().min(3, "Please give a reason (at least 3 characters).").max(200),
    details: z.string().trim().max(2000).optional().nullable(),
    dmcaClaimantName: z.string().trim().max(200).optional().nullable(),
    dmcaClaimantEmail: z.string().trim().email("Invalid claimant email.").max(320).optional().nullable(),
    dmcaOriginalWorkUrl: z.string().trim().url("Invalid original work URL.").max(2000).optional().nullable(),
  })
  .refine((v) => v.storyId || v.chapterId || v.episodeId || v.commentId || v.reportedUserId, "Nothing to report.")
  .refine(
    (v) => v.reportType !== "dmca" || (v.dmcaClaimantName && v.dmcaClaimantEmail && v.dmcaOriginalWorkUrl),
    "DMCA reports require the claimant name, email and the URL of the original work."
  );

async function ensureExists(table: "stories" | "chapters" | "episodes", id: string, label: string) {
  const { data, error } = await supabaseAdmin.from(table).select("id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw createError(`${label} not found.`, 404);
}

router.post(
  "/",
  requireAuth,
  reportLimiter,
  asyncHandler(async (req, res) => {
    const body = parse(CreateReportSchema, req.body);
    const reporterId = req.user!.id;
    await assertNotTimedOut(reporterId);

    let { storyId, reportedUserId } = body;
    const { chapterId, episodeId, commentId } = body;

    // Fill in who/where from the reported comment so admins can always navigate to it
    if (commentId) {
      const { data: comment, error } = await supabaseAdmin
        .from("comments")
        .select("user_id, story_id")
        .eq("id", commentId)
        .maybeSingle();
      if (error) throw error;
      if (!comment) throw createError("Comment not found.", 404);
      reportedUserId = reportedUserId ?? comment.user_id;
      storyId = storyId ?? comment.story_id;
    }
    if (storyId) await ensureExists("stories", storyId, "Story");
    if (chapterId) await ensureExists("chapters", chapterId, "Chapter");
    if (episodeId) await ensureExists("episodes", episodeId, "Episode");

    if (reportedUserId === reporterId) throw createError("You can't report yourself.", 400);

    // One open report per reporter for the exact same target
    let dup = supabaseAdmin
      .from("reports")
      .select("id")
      .eq("reporter_id", reporterId)
      .in("status", ["pending", "reviewing"])
      .limit(1);
    const targetCols = {
      story_id: storyId ?? null,
      chapter_id: chapterId ?? null,
      episode_id: episodeId ?? null,
      comment_id: commentId ?? null,
      reported_user_id: reportedUserId ?? null,
    };
    for (const [col, val] of Object.entries(targetCols) as [keyof typeof targetCols, string | null][]) {
      dup = val ? dup.eq(col, val) : dup.is(col, null);
    }

    const { data: existing, error: dupErr } = await dup;
    if (dupErr) throw dupErr;
    if (existing?.length) throw createError("You already have an open report for this. Our team will review it.", 409);

    const isDmca = body.reportType === "dmca";
    const { data, error } = await supabaseAdmin
      .from("reports")
      .insert({
        reporter_id: reporterId,
        report_type: body.reportType,
        story_id: storyId ?? null,
        chapter_id: chapterId ?? null,
        episode_id: episodeId ?? null,
        comment_id: commentId ?? null,
        reported_user_id: reportedUserId ?? null,
        reason: body.reason,
        details: body.details || null,
        dmca_claimant_name: isDmca ? body.dmcaClaimantName : null,
        dmca_claimant_email: isDmca ? body.dmcaClaimantEmail : null,
        dmca_original_work_url: isDmca ? body.dmcaOriginalWorkUrl : null,
      })
      .select("id, status, created_at")
      .single();

    if (error) throw error;
    sendData(res, data, 201);
  })
);

export default router;
