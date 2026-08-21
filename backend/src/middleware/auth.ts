import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import type { AuthUser } from "../types/index";
import "../types/express";

async function getUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.role;
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing or malformed Authorization header." });
    return;
  }

  const jwt = authHeader.slice(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(jwt);

  if (error || !user) {
    res.status(401).json({ success: false, error: "Invalid or expired token." });
    return;
  }

  req.user = { id: user.id, email: user.email ?? undefined } satisfies AuthUser;
  req.jwt = jwt;
  next();
};

export const requireCreator = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  const role = await getUserRole(req.user.id);

  if (!role || !["creator", "admin", "moderator"].includes(role)) {
    res.status(403).json({ success: false, error: "Creator account required." });
    return;
  }

  req.user.role = role;
  next();
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  const role = await getUserRole(req.user.id);

  if (role !== "admin") {
    res.status(403).json({ success: false, error: "Admin access required." });
    return;
  }

  req.user.role = "admin";
  next();
};

export const requireModerator = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  const role = await getUserRole(req.user.id);

  if (!role || !["admin", "moderator"].includes(role)) {
    res.status(403).json({ success: false, error: "Moderator access required." });
    return;
  }

  req.user.role = role;
  next();
};

