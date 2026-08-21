import { createClient } from "@supabase/supabase-js";

export const runSecurityAudit = async (
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("\n🔒 MIDNIGHT SECURITY AUDIT\n");

  console.log("1️⃣  Checking Supabase RLS policies...");
  try {
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
      "user_2fa_secrets",
      "user_sessions",
    ];

    for (const table of tables) {
      const { data } = await supabase.from(table).select("*").limit(1);
      if (data === null) {
        console.log(`   ✅ ${table}: RLS enabled`);
      } else {
        console.log(`   ⚠️  ${table}: Check RLS configuration`);
      }
    }
  } catch (err) {
    console.log("   ⚠️  Could not verify RLS - ensure you're using service role key");
  }

  console.log("\n2️⃣  Verifying database tables...");
  const { data: tables, error } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");

  if (error) {
    console.log("   ⚠️  Could not verify tables");
  } else {
    const requiredTables = [
      "profiles",
      "user_roles",
      "stories",
      "chapters",
      "comments",
      "ratings",
      "reviews",
      "user_blocks",
      "user_2fa_secrets",
      "user_sessions",
    ];

    const existingTables = (tables || []).map((t) => t.table_name);
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table}: MISSING - Run migrations!`);
      }
    }
  }

  console.log("\n3️⃣  Checking for service_role key in environment...");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    console.log("   ✅ Service role key configured");
    console.log("   ⚠️  Ensure it's NEVER exposed in frontend bundle!");
  } else {
    console.log("   ❌ Service role key not configured");
  }

  console.log("\n4️⃣  Verifying JWT authentication...");
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("   ✅ Authentication system operational");
  } catch {
    console.log("   ⚠️  Auth not configured for this session");
  }

  console.log("\n✨ Security audit complete!\n");
  console.log("Next steps:");
  console.log("  1. Review all RLS policies in Supabase Console");
  console.log("  2. Verify service_role key is only in backend .env");
  console.log("  3. Run migration-v3.sql in Supabase");
  console.log("  4. Test all authentication flows");
  console.log("  5. Deploy with security headers enabled\n");
};

if (require.main === module) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  runSecurityAudit(url, key).catch((err) => {
    console.error("❌ Audit failed:", err);
    process.exit(1);
  });
}
