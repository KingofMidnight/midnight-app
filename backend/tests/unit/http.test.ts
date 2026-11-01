import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { Request } from "express";
import { parse, uuidParam, PaginationSchema } from "../../src/utils/http";

const reqWith = (params: Record<string, string>) => ({ params }) as unknown as Request;

describe("parse", () => {
  it("returns parsed data", () => {
    expect(parse(z.object({ a: z.number() }), { a: 1 })).toEqual({ a: 1 });
  });

  it("throws a 400 with the first issue's message", () => {
    expect(() => parse(z.object({ a: z.number({ message: "a must be a number" }) }), { a: "x" })).toThrowError(
      expect.objectContaining({ statusCode: 400, message: "a must be a number" })
    );
  });
});

describe("uuidParam", () => {
  it("accepts a UUID", () => {
    const id = "3e61dbf4-cd46-4efa-9ab1-f45c404f60f7";
    expect(uuidParam(reqWith({ storyId: id }), "storyId")).toBe(id);
  });

  it("rejects anything else with a named 400", () => {
    expect(() => uuidParam(reqWith({ storyId: "1 OR 1=1" }), "storyId")).toThrowError(
      expect.objectContaining({ statusCode: 400, message: "Invalid storyId." })
    );
  });
});

describe("PaginationSchema", () => {
  it("applies defaults", () => {
    expect(PaginationSchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it("coerces query strings", () => {
    expect(PaginationSchema.parse({ limit: "5", offset: "10" })).toEqual({ limit: 5, offset: 10 });
  });

  it.each([{ limit: "0" }, { limit: "101" }, { limit: "abc" }, { offset: "-1" }])("rejects %o", (q) => {
    expect(PaginationSchema.safeParse(q).success).toBe(false);
  });
});
