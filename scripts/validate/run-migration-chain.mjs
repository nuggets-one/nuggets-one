/**
 * One-off runner: drop_policies + migration SQL files in order.
 * Usage: node scripts/validate/run-migration-chain.mjs
 * Loads DATABASE_URL from .env.local then .env (same as supabase-ddl-verify.ts).
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(ROOT, ".env.local"), override: false });
dotenv.config({ path: path.join(ROOT, ".env") });

const FILES = [
  "scripts/validate/ddl/drop_policies.sql",
  "supabase/migrations/20240001000000_initial_schema.sql",
  "supabase/migrations/20240001000001_rls_policies.sql",
  "supabase/migrations/20240001000002_additional_indexes.sql",
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Missing DATABASE_URL in .env.local or .env");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    for (let i = 0; i < FILES.length; i++) {
      const rel = FILES[i];
      const full = path.join(ROOT, rel);
      const sql = fs.readFileSync(full, "utf8");
      console.log(`\n--- Step ${i + 1}/${FILES.length}: ${rel} ---`);
      await pool.query(sql);
      console.log("OK");
    }
    console.log("\nMigration chain completed.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
