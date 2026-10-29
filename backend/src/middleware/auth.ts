import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import type { AppRole, AuthUser } from "../types/index";
import "../types/express";

const ROLE_PRIORITY: AppRole[] = ["admin", "moderator", "creator", "user"];

export async function getUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data.map((r) => r.role);
}

const requireAnyRole = (allowed: AppRole[], message: string) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated." });
      return;
    }

    const roles = await getUserRoles(req.user.id);
    const match = ROLE_PRIORITY.find((r) => allowed.includes(r) && roles.includes(r));

    if (!match) {
      res.status(403).json({ success: false, error: message });
      return;
    }

    req.user.role = match;
    next();
  };

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

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const jwt = authHeader.slice(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (user) {
      req.user = { id: user.id, email: user.email ?? undefined } satisfies AuthUser;
      req.jwt = jwt;
    }
  }
  next();
};

export const requireCreator = requireAnyRole(["creator", "admin", "moderator"], "Creator account required.");

export const requireAdmin = requireAnyRole(["admin"], "Admin access required.");

export const requireModerator = requireAnyRole(["admin", "moderator"], "Moderator access required.");
