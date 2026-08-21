import { supabaseAdmin } from "../config/supabase";

interface RLSCheck {
  table: string;
  hasDefaultPolicy: boolean;
  publiclyAccessible: boolean;
  policies: any[];
}

export const checkSupabaseRLS = async (): Promise<{ safe: boolean; tables: RLSCheck[] }> => {
  const tables = [
    "profiles",
    "user_roles",
    "user_bans",
    "stories",
    "chapters",
    "episodes",
    "comments",
    "ratings",
    "user_lists",
    "user_progress",
    "hidden_stories",
    "notifications",
    "reports",
    "user_blocks",
    "reviews",
  ];

  const results: RLSCheck[] = [];
  let allSafe = true;

  for (const table of tables) {
    try {
      const { data: policies, error } = await supabaseAdmin
        .from("information_schema.role_table_grants")
        .select("*")
        .eq("table_name", table)
        .eq("grantee", "anon");

      const isPublic = !error && policies && policies.length > 0;
      if (isPublic) allSafe = false;

      results.push({
        table,
        hasDefaultPolicy: !isPublic,
        publiclyAccessible: isPublic,
        policies: policies || [],
      });
    } catch {
      allSafe = false;
      results.push({
        table,
        hasDefaultPolicy: false,
        publiclyAccessible: true,
        policies: [],
      });
    }
  }

  return { safe: allSafe, tables: results };
};

export const validateNoServiceRoleInBundle = (bundleContent: string): boolean => {
  const serviceRolePatterns = [
    /SUPABASE_SERVICE_ROLE_KEY/,
    /service_role_key/,
    /service.?role/i,
  ];

  return !serviceRolePatterns.some((pattern) => pattern.test(bundleContent));
};
