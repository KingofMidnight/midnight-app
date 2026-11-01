import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonDb, api, cleanup, createUser, sa, signInAs, startApi, stopApi, totp, type TestUser } from "./helpers";

let admin: TestUser, creator: TestUser, reader: TestUser;
let storyId: string, chapterId: string;

beforeAll(async () => {
  await startApi();
  [admin, creator, reader] = await Promise.all([createUser("admin"), createUser("creator"), createUser()]);
  const s = await creator.db.from("stories").insert({ title: "ZZ live test", type: "novel", created_by: creator.id, review_status: "approved", is_cyoa: true }).select("id").single();
  storyId = s.data!.id;
  const c = await creator.db.from("chapters").insert({ story_id: storyId, chapter_number: 1, title: "Ch1", content: "<p>Hello</p>", review_status: "approved" }).select("id").single();
  chapterId = c.data!.id;
});

afterAll(async () => {
  await cleanup();
  await stopApi();
});

describe("API basics", () => {
  it("health + consistent error shape", async () => {
    expect((await api("GET", "/api/health")).json).toMatchObject({ success: true, data: { status: "ok" } });
    expect((await api("GET", "/api/nope")).json).toMatchObject({ success: false });
  });

  it("validates params and pagination", async () => {
    expect((await api("GET", "/api/comments/story/not-a-uuid")).status).toBe(400);
    expect((await api("GET", "/api/stories/trending?limit=1000")).status).toBe(400);
    expect((await api("GET", "/api/views/stories/00000000-0000-0000-0000-000000000000")).status).toBe(404);
  });

  it("protects admin routes", async () => {
    expect((await api("GET", "/api/admin/pending")).status).toBe(401);
    expect((await api("GET", "/api/admin/pending", reader.jwt)).status).toBe(403);
    expect((await api("GET", "/api/admin/pending", admin.jwt)).status).toBe(200);
  });
});

describe("post-moderation", () => {
  it("creators publish directly and edits keep content live", async () => {
    const r = await creator.db.from("chapters").update({ title: "Ch1 edited" }).eq("id", chapterId).select("review_status").single();
    expect(r.data!.review_status).toBe("approved");
  });

  it("a takedown can only be lifted by an admin", async () => {
    expect((await api("PATCH", `/api/admin/chapters/${chapterId}/review`, admin.jwt, { status: "rejected" })).status).toBe(200);
    const r = await creator.db.from("chapters").update({ review_status: "approved" }).eq("id", chapterId).select("review_status").single();
    expect(r.data!.review_status).toBe("rejected");
    expect((await anonDb().from("chapters").select("id").eq("id", chapterId)).data).toHaveLength(0);
    expect((await api("PATCH", `/api/admin/chapters/${chapterId}/review`, admin.jwt, { status: "approved" })).status).toBe(200);
  });
});

describe("comments, reports, warnings, timeouts", () => {
  it("sanitizes comments and enforces ownership", async () => {
    const r = await api("POST", "/api/comments", reader.jwt, { storyId, content: "<p>hi</p><img src=x onerror=alert(1)>" });
    expect(r.status).toBe(201);
    expect(r.json.data.content).not.toContain("onerror");
    expect((await api("PATCH", `/api/comments/${r.json.data.id}`, creator.jwt, { content: "hijack" })).status).toBe(403);
  });

  it("reports: validation, duplicates, no direct DB inserts", async () => {
    expect((await api("POST", "/api/reports", reader.jwt, { reportType: "content", storyId, reason: "Live test report" })).status).toBe(201);
    expect((await api("POST", "/api/reports", reader.jwt, { reportType: "content", storyId, reason: "Live test report" })).status).toBe(409);
    expect((await api("POST", "/api/reports", reader.jwt, { reportType: "dmca", storyId, reason: "copied" })).status).toBe(400);
    expect((await api("POST", "/api/reports", reader.jwt, { reportType: "user", reportedUserId: reader.id, reason: "myself" })).status).toBe(400);
    const direct = await reader.db.from("reports").insert({ reporter_id: reader.id, report_type: "content", story_id: storyId, reason: "direct" });
    expect(direct.error).not.toBeNull();
  });

  it("warnings notify the user and can be acknowledged", async () => {
    const w = await api("POST", `/api/admin/users/${reader.id}/warn`, admin.jwt, { reason: "Live test warning" });
    expect(w.status).toBe(201);
    let me = await api("GET", "/api/moderation/me", reader.jwt);
    expect(me.json.data.unacknowledged).toBe(1);
    expect((await api("POST", `/api/moderation/${w.json.data.id}/acknowledge`, reader.jwt)).status).toBe(200);
    me = await api("GET", "/api/moderation/me", reader.jwt);
    expect(me.json.data.unacknowledged).toBe(0);
    const n = await sa.from("notifications").select("type").eq("user_id", reader.id);
    expect(n.data!.some((x) => x.type === "moderation")).toBe(true);
  });

  it("timeouts block writes (API, database, uploads) but not reading", async () => {
    expect((await api("POST", `/api/admin/users/${creator.id}/timeout`, admin.jwt, { duration: "1h", reason: "Live test" })).status).toBe(201);
    expect((await api("POST", "/api/comments", creator.jwt, { storyId, content: "<p>x</p>" })).status).toBe(403);
    expect((await creator.db.from("chapters").insert({ story_id: storyId, chapter_number: 9, title: "x" })).error).not.toBeNull();
    const up = await creator.db.storage.from("covers").upload(`${creator.id}/t.png`, Buffer.from("x"), { contentType: "image/png" });
    expect(up.error).not.toBeNull();
    expect((await creator.db.from("stories").select("id").eq("id", storyId)).data).toHaveLength(1);
    expect((await api("DELETE", `/api/admin/users/${creator.id}/timeout`, admin.jwt)).json.data.revoked).toBe(1);
  });
});

describe("CYOA and uploads", () => {
  it("choices must stay within the same story", async () => {
    const other = await creator.db.from("stories").insert({ title: "ZZ other", type: "novel", created_by: creator.id, review_status: "approved" }).select("id").single();
    const oc = await creator.db.from("chapters").insert({ story_id: other.data!.id, chapter_number: 1, title: "O1", review_status: "approved" }).select("id").single();
    const r = await creator.db.from("chapter_choices").insert({ source_chapter_id: chapterId, target_chapter_id: oc.data!.id, label: "x" });
    expect(r.error?.message).toMatch(/same story/);
  });

  it("uploads: images only, size limits, own folders", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const own = await creator.db.storage.from("covers").upload(`${creator.id}/live-${Date.now()}.png`, png, { contentType: "image/png" });
    expect(own.error).toBeNull();
    await sa.storage.from("covers").remove([own.data!.path]);
    expect((await creator.db.storage.from("covers").upload(`${reader.id}/x.png`, png, { contentType: "image/png" })).error).not.toBeNull();
    expect((await creator.db.storage.from("covers").upload(`${creator.id}/x.html`, Buffer.from("<b>"), { contentType: "text/html" })).error).not.toBeNull();
    expect((await creator.db.storage.from("covers").upload(`${creator.id}/big.png`, Buffer.alloc(6 * 1024 * 1024), { contentType: "image/png" })).error).not.toBeNull();
  });
});

describe("two-factor authentication (Supabase MFA)", () => {
  it("aal1 sessions of 2FA users are refused by the API and the database", async () => {
    const user = await createUser();
    const en = await user.client.auth.mfa.enroll({ factorType: "totp" });
    await user.client.auth.mfa.challengeAndVerify({ factorId: en.data!.id, code: totp(en.data!.totp.secret) });

    const fresh = await signInAs(user.id, user.email); // new sign-in => aal1
    const r = await api("GET", "/api/moderation/me", fresh.jwt);
    expect(r.status).toBe(401);
    expect(r.json.code).toBe("mfa_required");
    const write = await fresh.db.from("profiles").update({ bio: "aal1 write" }).eq("id", user.id).select("id");
    expect(write.error !== null || (write.data ?? []).length === 0).toBe(true);

    expect((await api("GET", "/api/moderation/me", reader.jwt)).status).toBe(200); // users without 2FA unaffected
  });
});

describe("exports", () => {
  it("renders a PDF and an EPUB", async () => {
    const pdf = await api("GET", `/api/export/pdf/${chapterId}`, reader.jwt);
    expect(pdf.status).toBe(200);
    expect(pdf.type).toContain("application/pdf");
    const epub = await api("GET", `/api/export/epub/${storyId}`, reader.jwt);
    expect(epub.status).toBe(200);
    expect(epub.type).toContain("epub");
  });
});
