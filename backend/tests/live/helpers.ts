import crypto from "crypto";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import app from "../../src/app";
import { supabaseAdmin } from "../../src/config/supabase";
import type { Database } from "../../src/types/database";

export const sa = supabaseAdmin;
const URL_ = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_ANON_KEY!;

export interface TestUser {
  id: string;
  email: string;
  jwt: string;
  db: SupabaseClient<Database>;
  client: SupabaseClient<Database>;
}

let server: Server | undefined;
let base = "";
const created: string[] = [];

export async function startApi(): Promise<void> {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

export async function stopApi(): Promise<void> {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
}

// Bot Protection (captcha) blocks password sign-in from scripts, so sessions come
// from admin-generated magic links. Every user created here is deleted by cleanup().
export async function createUser(role?: "creator" | "admin" | "moderator"): Promise<TestUser> {
  const email = `midnight-test-${crypto.randomBytes(5).toString("hex")}@example.com`;
  const { data, error } = await sa.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  created.push(data.user.id);
  if (role) await sa.from("user_roles").insert({ user_id: data.user.id, role });
  return signInAs(data.user.id, email);
}

export async function signInAs(id: string, email: string): Promise<TestUser> {
  const client = createClient<Database>(URL_, KEY, { auth: { persistSession: false } });
  const link = await sa.auth.admin.generateLink({ type: "magiclink", email });
  const { data, error } = await client.auth.verifyOtp({ token_hash: link.data.properties!.hashed_token, type: "magiclink" });
  if (error || !data.session) throw error ?? new Error("sign-in failed");
  const jwt = data.session.access_token;
  const db = createClient<Database>(URL_, KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  return { id, email, jwt, db, client };
}

export const anonDb = () => createClient<Database>(URL_, KEY, { auth: { persistSession: false } });

export async function api(method: string, path: string, jwt?: string | null, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get("content-type") ?? "";
  return {
    status: res.status,
    type,
    json: type.includes("json") ? await res.json() : null,
    bytes: type.includes("json") ? 0 : (await res.arrayBuffer()).byteLength,
  };
}

export async function cleanup(): Promise<void> {
  for (const id of created.splice(0)) {
    await sa.from("reports").delete().eq("reporter_id", id);
    await sa.from("stories").delete().eq("created_by", id);
    await sa.auth.admin.deleteUser(id);
  }
}

// RFC 6238 TOTP, for completing Supabase MFA in tests
export function totp(secret: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const ch of secret) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  let counter = Math.floor(Date.now() / 30000);
  const buf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) { buf[i] = counter & 0xff; counter = Math.floor(counter / 256); }
  const d = crypto.createHmac("sha1", Buffer.from(bytes)).update(buf).digest();
  const o = d[d.length - 1] & 0xf;
  return String((((d[o] & 0x7f) << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) % 1e6).padStart(6, "0");
}
