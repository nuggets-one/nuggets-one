/**
 * Supabase DDL apply + RLS/trigger verification.
 * Loads env: .env.local (no override), then .env.
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(__dirname, "output");
const DDL_PATH = path.join(__dirname, "ddl", "schema.sql");
const REPORT_PATH = path.join(OUT_DIR, "supabase-ddl-report.json");

const EXPECTED_TABLES = [
  "profiles",
  "tags",
  "articles",
  "article_tags",
  "article_media",
  "bookmarks",
  "notification_preferences",
  "user_notifications",
  "community_collections",
  "community_collection_entries",
] as const;

function loadEnv(): void {
  dotenv.config({ path: path.join(ROOT, ".env.local"), override: false });
  dotenv.config({ path: path.join(ROOT, ".env") });
}

function logDdlGroups(sql: string): void {
  const lines = sql.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("-- ") && t.length > 3) {
      console.log(`[DDL group] ${t}`);
    }
  }
}

type CheckResult = { passed: boolean; detail: string };

function emptyReport() {
  return {
    ddlApplied: false,
    tablesCreated: [] as string[],
    tablesMissing: [] as string[],
    rlsChecks: {
      anonCannotReadDrafts: { passed: false, detail: "" } as CheckResult,
      anonCannotReadBookmarks: { passed: false, detail: "" } as CheckResult,
      anonCannotWriteArticles: { passed: false, detail: "" } as CheckResult,
      userCannotReadOtherBookmarks: { passed: false, detail: "" } as CheckResult,
    },
    triggerChecks: {
      publishedAtFreeze: { passed: false, detail: "" } as CheckResult,
      searchVectorGenerated: { passed: false, detail: "" } as CheckResult,
      profileSeedTrigger: { passed: false, detail: "" } as CheckResult,
    },
    allPassed: false,
  };
}

async function adminCreateUser(
  supabaseUrl: string,
  serviceKey: string,
  email: string,
  password: string
): Promise<{ id: string }> {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`admin create user failed: ${res.status} ${text}`);
  }
  const body = JSON.parse(text) as Record<string, unknown>;
  const userObj = body.user as { id?: string } | undefined;
  const id =
    (typeof body.id === "string" ? body.id : undefined) ??
    (userObj && typeof userObj.id === "string" ? userObj.id : undefined);
  if (!id) throw new Error(`admin create user: no id in response: ${text}`);
  return { id };
}

async function adminDeleteUser(
  supabaseUrl: string,
  serviceKey: string,
  userId: string
): Promise<void> {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${userId}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`admin delete user failed: ${res.status} ${text}`);
  }
}

async function signInWithPassword(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`password sign-in failed: ${res.status} ${text}`);
  }
  const body = JSON.parse(text) as { access_token?: string };
  if (!body.access_token) {
    throw new Error(`no access_token: ${text}`);
  }
  return body.access_token;
}

function writeReport(report: ReturnType<typeof emptyReport>): void {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
}

/** Service-role setup must use DATABASE_URL (direct Postgres), not PostgREST — RLS applies as authenticator via REST. */
async function pgInsertArticle(
  pool: pg.Pool,
  fields: {
    slug: string;
    title: string;
    content_stream?: string;
    status?: string;
    published_at?: string | null;
  }
): Promise<
  | { ok: true; id: string; published_at: Date | null }
  | { ok: false; error: string }
> {
  const content_stream = fields.content_stream ?? "standard";
  const status = fields.status ?? "draft";
  const published_at =
    fields.published_at !== undefined ? fields.published_at : null;
  try {
    const r = await pool.query<{ id: string; published_at: Date | null }>(
      `INSERT INTO public.articles (slug, title, content_stream, status, published_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, published_at`,
      [fields.slug, fields.title, content_stream, status, published_at]
    );
    const row = r.rows[0];
    if (!row) return { ok: false, error: "no row returned" };
    return { ok: true, id: row.id, published_at: row.published_at };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function summarize(report: ReturnType<typeof emptyReport>): void {
  console.log("\n--- Supabase DDL + RLS summary ---");
  console.log(`DDL applied: ${report.ddlApplied}`);
  console.log(`Tables missing: ${report.tablesMissing.length ? report.tablesMissing.join(", ") : "none"}`);
  for (const [k, v] of Object.entries(report.rlsChecks)) {
    console.log(`  RLS ${k}: ${v.passed ? "PASS" : "FAIL"} — ${v.detail}`);
  }
  for (const [k, v] of Object.entries(report.triggerChecks)) {
    console.log(`  Trigger ${k}: ${v.passed ? "PASS" : "FAIL"} — ${v.detail}`);
  }
  console.log(`Overall: ${report.allPassed ? "ALL PASSED" : "SOME FAILED"}`);
  console.log(`Report: ${REPORT_PATH}\n`);
}

async function main(): Promise<number> {
  loadEnv();

  const report = emptyReport();

  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!databaseUrl || !supabaseUrl || !anonKey || !serviceKey) {
    report.allPassed = false;
    writeReport(report);
    console.error(
      "Missing DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY"
    );
    summarize(report);
    return 1;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ts = Date.now();
  const cleanup = {
    articleSlugs: new Set<string>(),
    userIds: new Set<string>(),
  };

  async function safeDeleteArticlesBySlugs(): Promise<void> {
    for (const slug of cleanup.articleSlugs) {
      try {
        await pool.query(`DELETE FROM public.articles WHERE slug = $1`, [slug]);
      } catch (e) {
        console.warn(
          `[cleanup] delete article ${slug}:`,
          e instanceof Error ? e.message : e
        );
      }
    }
  }

  async function safeDeleteUsers(): Promise<void> {
    for (const uid of cleanup.userIds) {
      try {
        await adminDeleteUser(supabaseUrl, serviceKey, uid);
      } catch (e) {
        console.warn(`[cleanup] delete user ${uid}:`, e);
      }
    }
  }

  async function fullCleanup(): Promise<void> {
    await safeDeleteArticlesBySlugs();
    await safeDeleteUsers();
  }

  try {
    // --- Part A: DDL ---
    const ddlSql = fs.readFileSync(DDL_PATH, "utf8");
    logDdlGroups(ddlSql);
    console.log("[DDL] Executing full schema.sql as a single query...");
    try {
      await pool.query(ddlSql);
      report.ddlApplied = true;
      console.log("[DDL] OK");
    } catch (e) {
      report.ddlApplied = false;
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[DDL] FAILED:", msg);
      report.tablesMissing = [...EXPECTED_TABLES];
      writeReport(report);
      summarize(report);
      return 1;
    }

    const tblRes = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const have = new Set(tblRes.rows.map((r) => r.table_name));
    report.tablesCreated = EXPECTED_TABLES.filter((t) => have.has(t));
    report.tablesMissing = EXPECTED_TABLES.filter((t) => !have.has(t));

    if (report.tablesMissing.length > 0) {
      writeReport(report);
      summarize(report);
      return 1;
    }

    // --- CHECK 1: anon cannot read drafts ---
    const draftSlug = `rls-test-draft-${ts}`;
    cleanup.articleSlugs.add(draftSlug);
    try {
      const ins = await pgInsertArticle(pool, {
        status: "draft",
        title: "rls-test-draft",
        slug: draftSlug,
        content_stream: "standard",
        published_at: null,
      });
      if (!ins.ok) {
        report.rlsChecks.anonCannotReadDrafts = {
          passed: false,
          detail: `setup insert failed: ${ins.error}`,
        };
      } else {
        const q = await anon.from("articles").select("id").eq("slug", draftSlug);
        const rows = q.data?.length ?? 0;
        report.rlsChecks.anonCannotReadDrafts = {
          passed: rows === 0 && !q.error,
          detail:
            rows === 0 && !q.error
              ? "Anon SELECT returned 0 rows"
              : `Expected 0 rows without error; got rows=${rows}, error=${q.error?.message ?? "none"}`,
        };
      }
    } catch (e) {
      report.rlsChecks.anonCannotReadDrafts = {
        passed: false,
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    // --- CHECK 2: anon cannot read bookmarks ---
    try {
      const q = await anon.from("bookmarks").select("user_id").limit(5);
      const empty = (q.data?.length ?? 0) === 0;
      const errored = q.error != null;
      report.rlsChecks.anonCannotReadBookmarks = {
        passed: empty || errored,
        detail: errored
          ? `Error (expected for RLS): ${q.error.message}`
          : empty
            ? "Empty result set for anon"
            : `Unexpected data returned: ${JSON.stringify(q.data)}`,
      };
    } catch (e) {
      report.rlsChecks.anonCannotReadBookmarks = {
        passed: true,
        detail: `Exception (treated as blocked): ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    // --- CHECK 3: anon cannot write articles ---
    try {
      const slug = `rls-test-anon-insert-${ts}`;
      const attempt = await anon.from("articles").insert({
        title: "x",
        slug,
        content_stream: "standard",
        status: "draft",
      }).select("id");
      const failed =
        attempt.error != null ||
        attempt.data == null ||
        attempt.data.length === 0;
      report.rlsChecks.anonCannotWriteArticles = {
        passed: failed,
        detail: failed
          ? attempt.error
            ? `Insert blocked: ${attempt.error.message}`
            : "No row returned (blocked)"
          : "Anon INSERT unexpectedly succeeded",
      };
      if (attempt.data?.length && !attempt.error) {
        await pool.query(`DELETE FROM public.articles WHERE slug = $1`, [slug]);
      }
    } catch (e) {
      report.rlsChecks.anonCannotWriteArticles = {
        passed: true,
        detail: `Exception (blocked): ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    // --- CHECK 4: user B cannot see user A bookmark ---
    const emailA = `testA-${ts}@validate.test`;
    const emailB = `testB-${ts}@validate.test`;
    const pwd = `ValTest_${ts}_!`;
    try {
      const ua = await adminCreateUser(supabaseUrl, serviceKey, emailA, pwd);
      const ub = await adminCreateUser(supabaseUrl, serviceKey, emailB, pwd);
      const userA = ua.id;
      cleanup.userIds.add(userA);
      cleanup.userIds.add(ub.id);

      const artSlug = `bm-article-${ts}`;
      cleanup.articleSlugs.add(artSlug);
      const artIns = await pgInsertArticle(pool, {
        title: "Bookmark RLS",
        slug: artSlug,
        content_stream: "standard",
        status: "published",
        published_at: new Date().toISOString(),
      });
      if (!artIns.ok) {
        report.rlsChecks.userCannotReadOtherBookmarks = {
          passed: false,
          detail: `setup article: ${artIns.error}`,
        };
      } else {
        const articleForBookmark = artIns.id;
        let bmErr: string | null = null;
        try {
          await pool.query(
            `INSERT INTO public.bookmarks (user_id, article_id) VALUES ($1::uuid, $2::uuid)`,
            [userA, articleForBookmark]
          );
        } catch (e) {
          bmErr = e instanceof Error ? e.message : String(e);
        }
        if (bmErr) {
          report.rlsChecks.userCannotReadOtherBookmarks = {
            passed: false,
            detail: `setup bookmark: ${bmErr}`,
          };
        } else {
          const jwtB = await signInWithPassword(
            supabaseUrl,
            anonKey,
            emailB,
            pwd
          );
          const bClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: `Bearer ${jwtB}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const bq = await bClient
            .from("bookmarks")
            .select("article_id")
            .eq("article_id", articleForBookmark);
          const visible = (bq.data?.length ?? 0) > 0;
          report.rlsChecks.userCannotReadOtherBookmarks = {
            passed: !visible && !bq.error,
            detail: !visible && !bq.error
              ? "User B sees 0 rows for A's bookmarked article"
              : `Expected 0 rows; got ${bq.data?.length ?? 0}, error=${bq.error?.message}`,
          };
        }
      }
    } catch (e) {
      report.rlsChecks.userCannotReadOtherBookmarks = {
        passed: false,
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    // --- CHECK 5: published_at freeze ---
    const freezeSlug = `freeze-test-${ts}`;
    cleanup.articleSlugs.add(freezeSlug);
    try {
      const ins = await pgInsertArticle(pool, {
        title: "freeze",
        slug: freezeSlug,
        content_stream: "standard",
        status: "published",
        published_at: new Date().toISOString(),
      });
      if (!ins.ok || ins.published_at == null) {
        report.triggerChecks.publishedAtFreeze = {
          passed: false,
          detail: `insert: ${!ins.ok ? ins.error : "no published_at"}`,
        };
      } else {
        const originalPublishedAt = ins.published_at;
        await pool.query(
          `UPDATE public.articles SET published_at = $1::timestamptz WHERE slug = $2`,
          [new Date(Date.now() - 365 * 864e5).toISOString(), freezeSlug]
        );
        const sel = await pool.query<{ published_at: Date }>(
          `SELECT published_at FROM public.articles WHERE slug = $1`,
          [freezeSlug]
        );
        const returnedPublishedAt = sel.rows[0]?.published_at;
        if (returnedPublishedAt == null) {
          report.triggerChecks.publishedAtFreeze = {
            passed: false,
            detail: "no published_at after update",
          };
        } else {
          const original = new Date(originalPublishedAt).getTime();
          const after = new Date(returnedPublishedAt).getTime();
          const passed = original === after;
          report.triggerChecks.publishedAtFreeze = {
            passed,
            detail: passed
              ? `published_at unchanged (instant ${original} ms)`
              : `expected instant ${original} ms, got ${after} ms`,
          };
        }
      }
    } catch (e) {
      report.triggerChecks.publishedAtFreeze = {
        passed: false,
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    // --- CHECK 6: search_vector ---
    const searchSlug = `search-test-${ts}`;
    cleanup.articleSlugs.add(searchSlug);
    try {
      const ins = await pgInsertArticle(pool, {
        title: "ValidatorSearchTest",
        slug: searchSlug,
        content_stream: "standard",
        status: "draft",
        published_at: null,
      });
      if (!ins.ok) {
        report.triggerChecks.searchVectorGenerated = {
          passed: false,
          detail: ins.error,
        };
      } else {
        const qv = await pool.query<{ ok: boolean }>(
          `SELECT (search_vector @@ to_tsquery('english', 'ValidatorSearchTest')) AS ok
           FROM public.articles WHERE slug = $1`,
          [searchSlug]
        );
        const ok = qv.rows[0]?.ok === true;
        report.triggerChecks.searchVectorGenerated = {
          passed: ok,
          detail: ok
            ? "search_vector matches to_tsquery"
            : `expected true, got ${qv.rows[0]?.ok}`,
        };
      }
    } catch (e) {
      report.triggerChecks.searchVectorGenerated = {
        passed: false,
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    // --- CHECK 7: profile seed ---
    const profileEmail = `trigger-test-${ts}@validate.test`;
    let profileUserId = "";
    try {
      const u = await adminCreateUser(
        supabaseUrl,
        serviceKey,
        profileEmail,
        pwd
      );
      profileUserId = u.id;
      cleanup.userIds.add(profileUserId);

      const pr = await service
        .from("profiles")
        .select("id")
        .eq("id", profileUserId)
        .maybeSingle();
      const hasProfile = pr.data?.id === profileUserId && !pr.error;
      const beforeDetail = hasProfile
        ? `profiles row exists for ${profileUserId}`
        : `missing profile: ${pr.error?.message ?? "no row"}`;

      await adminDeleteUser(supabaseUrl, serviceKey, profileUserId);
      cleanup.userIds.delete(profileUserId);

      const afterDel = await service
        .from("profiles")
        .select("id")
        .eq("id", profileUserId)
        .maybeSingle();
      const cascadeOk = !afterDel.data;
      report.triggerChecks.profileSeedTrigger = {
        passed: hasProfile && cascadeOk,
        detail: `${beforeDetail}; after user delete, profile gone: ${cascadeOk}`,
      };
    } catch (e) {
      report.triggerChecks.profileSeedTrigger = {
        passed: false,
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    report.allPassed =
      report.ddlApplied &&
      report.tablesMissing.length === 0 &&
      Object.values(report.rlsChecks).every((c) => c.passed) &&
      Object.values(report.triggerChecks).every((c) => c.passed);

    writeReport(report);
    summarize(report);
    return report.allPassed ? 0 : 1;
  } catch (e) {
    console.error("Unhandled error:", e);
    report.allPassed = false;
    writeReport(report);
    summarize(report);
    return 1;
  } finally {
    try {
      await fullCleanup();
    } catch (e) {
      console.warn("[cleanup] fullCleanup error:", e);
    }
    await pool.end().catch((e) => console.warn("[pool.end]", e));
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
