import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { ZodError, z } from "zod";
import { createError, errorHandler } from "../../src/middleware/errorHandler";

function run(err: Error) {
  const res = { statusCode: 0, body: undefined as unknown } as { statusCode: number; body: any };
  const response = {
    status(code: number) { res.statusCode = code; return this; },
    json(body: unknown) { res.body = body; return this; },
  } as unknown as Response;
  errorHandler(err, {} as Request, response, () => {});
  return res;
}

describe("errorHandler", () => {
  const original = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = original; });
  vi.spyOn(console, "error").mockImplementation(() => {});

  it("returns the error's status and message for client errors", () => {
    process.env.NODE_ENV = "production";
    const res = run(createError("Story not found.", 404));
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: "Story not found." });
  });

  it("hides internal error details outside development", () => {
    process.env.NODE_ENV = "production";
    const res = run(new Error('relation "secret_table" does not exist'));
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Internal server error.");
    expect(JSON.stringify(res.body)).not.toContain("secret_table");
  });

  it("shows details in development", () => {
    process.env.NODE_ENV = "development";
    const res = run(new Error("boom"));
    expect(res.body.error).toBe("boom");
    expect(res.body.stack).toBeDefined();
  });

  it("turns zod errors into 400s", () => {
    process.env.NODE_ENV = "production";
    let zerr: ZodError | undefined;
    try { z.object({ a: z.string() }).parse({}); } catch (e) { zerr = e as ZodError; }
    const res = run(zerr!);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
