/**
 * שחזור מגיבוי יומי (bucket 'backups', קובץ YYYY-MM-DD.json.gz).
 *
 * הרצה (מקומית, עם מפתח service role — לעולם לא בדפדפן):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/restore-backup.ts 2026-09-06 [--tables listings,leads] [--dry-run]
 *
 * מה קורה: הקובץ יורד מה-bucket, נפרס, ולכל טבלה שנבחרה השורות נכתבות
 * ב-upsert לפי id (או key/PK ידוע). לא מוחק שורות שנוספו אחרי הגיבוי —
 * שחזור מלא-ומוחק דורש החלטה מפורשת (ראו הערה למטה).
 */
import { createClient } from "@supabase/supabase-js";
import { gunzipSync } from "node:zlib";

const PK: Record<string, string> = {
  app_settings: "id",
  market_scan_tasks: "key",
  rate_limits: "key,window_start",
  site_content: "site_id",
  user_roles: "id",
};

async function main() {
  const [day, ...rest] = process.argv.slice(2);
  if (!day) throw new Error("usage: restore-backup.ts <YYYY-MM-DD> [--tables a,b] [--dry-run]");
  const dryRun = rest.includes("--dry-run");
  const tablesArg = rest[rest.indexOf("--tables") + 1];
  const only = rest.includes("--tables") && tablesArg ? tablesArg.split(",") : null;

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY חסרים");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: file, error } = await db.storage.from("backups").download(`${day}.json.gz`);
  if (error || !file) throw new Error(`הורדת הגיבוי נכשלה: ${error?.message}`);
  const json = JSON.parse(gunzipSync(Buffer.from(await file.arrayBuffer())).toString("utf8")) as {
    created_at: string;
    tables: Record<string, Record<string, unknown>[]>;
  };
  console.log(`גיבוי מ-${json.created_at}, טבלאות: ${Object.keys(json.tables).join(", ")}`);

  // סדר לפי תלויות FK
  const order = [
    "profiles",
    "user_roles",
    "sites",
    "site_content",
    "site_items",
    "contacts",
    "listings",
    "listing_images",
    "sold_properties",
    "leads",
    "lead_events",
    "search_profiles",
    "market_listings",
    "listing_notifications",
    "listing_feedback",
    "scout_profiles",
    "facebook_connections",
    "app_settings",
  ];
  for (const table of order) {
    const rows = json.tables[table];
    if (!rows || (only && !only.includes(table))) continue;
    console.log(`${table}: ${rows.length} שורות${dryRun ? " (dry-run)" : ""}`);
    if (dryRun) continue;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error: upErr } = await db
        .from(table)
        .upsert(chunk, { onConflict: PK[table] ?? "id" });
      if (upErr) console.error(`  שגיאה ב-${table} [${i}]: ${upErr.message}`);
    }
  }
  console.log("סיום. שורות שנוספו אחרי הגיבוי לא נמחקו.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
