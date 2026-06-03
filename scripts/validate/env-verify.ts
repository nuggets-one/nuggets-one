/**
 * Build environment validation.
 * Loads env: .env.local (no override), then .env.
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(__dirname, "output");
const REPORT_PATH = path.join(OUT_DIR, "env-report.json");

const BANNED_PACKAGES = [
  "framer-motion",
  "mongoose",
  "express",
  "@tanstack/react-query",
  "@tanstack/react-virtual",
  "react-router-dom",
  "redux",
  "zustand",
  "jotai",
  "recoil",
  "mobx",
  "valtio",
  "xstate",
  "moment",
  "date-fns",
  "dayjs",
  "luxon",
  "styled-components",
  "@emotion/styled",
  "stitches",
  "react-youtube",
  "react-player",
  "slugify",
  "bullmq",
  "redis",
  "web-push",
  "react-modal",
  "react-spring",
  "auto-animate",
  "@vercel/og",
] as const;

function loadEnv(): void {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));
}

function stripOuterQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    const value = stripOuterQuotes(line.slice(idx + 1).trim());
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

function parseSemverParts(v: string): number[] {
  const cleaned = v.replace(/^v/i, "").split(/[+-]/)[0] ?? "";
  return cleaned.split(".").map((x) => {
    const n = parseInt(x, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

function gteVersion(version: string, minimum: string): boolean {
  const a = parseSemverParts(version);
  const b = parseSemverParts(minimum);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return true;
}

function readPackageJson(): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} | null {
  const p = path.join(ROOT, "package.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

function readInstalledPackageVersion(pkgName: string): string | null {
  const pkgJson = path.join(ROOT, "node_modules", pkgName, "package.json");
  if (!fs.existsSync(pkgJson)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(pkgJson, "utf8")) as {
      version?: string;
    };
    return j.version ?? null;
  } catch {
    return null;
  }
}

function findNextConfigText(): string | null {
  for (const name of ["next.config.ts", "next.config.js"]) {
    const p = path.join(ROOT, name);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf8");
    }
  }
  return null;
}

type EnvEntry = { present: boolean; formatValid: boolean };
type ValidationMode = "strict" | "build";

function parseMode(argv: string[]): ValidationMode {
  const modeArg = argv.find((arg) => arg.startsWith("--mode="));
  const raw = modeArg?.split("=")[1]?.trim().toLowerCase();
  return raw === "build" ? "build" : "strict";
}

function validateEnvVarsForMode(mode: ValidationMode): {
  entries: Record<string, EnvEntry>;
  allOk: boolean;
  requiredKeys: string[];
} {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const anon = process.env.SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const dbUrl = process.env.DATABASE_URL ?? "";
  const pubUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const pubAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const urlOk = (u: string) =>
    /^https:\/\/[^/]+\.supabase\.co\/?$/i.test(u.trim()) ||
    /^https:\/\/[^/]+\.supabase\.co$/i.test(u.trim());

  const jwtShape = (s: string) => s.split(".").length === 3;

  const entries: Record<string, EnvEntry> = {
    SUPABASE_URL: {
      present: !!supabaseUrl,
      formatValid: urlOk(supabaseUrl),
    },
    SUPABASE_ANON_KEY: {
      present: !!anon,
      formatValid: jwtShape(anon),
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      present: !!service,
      formatValid: jwtShape(service),
    },
    DATABASE_URL: {
      present: !!dbUrl,
      formatValid:
        dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"),
    },
    NEXT_PUBLIC_SUPABASE_URL: {
      present: !!pubUrl,
      formatValid: urlOk(pubUrl) && (!supabaseUrl || pubUrl === supabaseUrl),
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      present: !!pubAnon,
      formatValid: jwtShape(pubAnon) && (!anon || pubAnon === anon),
    },
  };

  const fcmRaw = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim() ?? "";
  let fcmFormatValid = true;
  if (fcmRaw) {
    try {
      const decoded = fcmRaw.startsWith("{")
        ? fcmRaw
        : Buffer.from(fcmRaw, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      fcmFormatValid = Boolean(
        parsed.project_id && parsed.client_email && parsed.private_key
      );
    } catch {
      fcmFormatValid = false;
    }
  }
  entries.FCM_SERVICE_ACCOUNT_JSON = {
    present: !!fcmRaw,
    formatValid: fcmRaw ? fcmFormatValid : true,
  };

  const requiredKeys: string[] =
    mode === "build"
      ? ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
      : Object.keys(entries);

  const allOk = requiredKeys.every((key) => {
    const entry = entries[key];
    return entry != null && entry.present && entry.formatValid;
  });
  return { entries, allOk, requiredKeys };
}

async function supabaseSmoke(
  baseUrl: string,
  anonKey: string
): Promise<{ statusCode: number | null; passed: boolean; detail: string }> {
  const url = `${baseUrl.replace(/\/$/, "")}/rest/v1/articles?limit=1`;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 20_000);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: ac.signal,
    });
    clearTimeout(t);
    const code = res.status;
    if (code === 401) {
      return {
        statusCode: code,
        passed: false,
        detail: "CRITICAL: 401 — anon key is wrong",
      };
    }
    if (code === 200 || code === 400) {
      return {
        statusCode: code,
        passed: true,
        detail: `HTTP ${code} (accepted)`,
      };
    }
    return {
      statusCode: code,
      passed: false,
      detail: `Unexpected status ${code}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const refused =
      /ECONNREFUSED|fetch failed|network|Failed to fetch|abort/i.test(msg);
    return {
      statusCode: null,
      passed: false,
      detail: refused
        ? `CRITICAL: connection failed (wrong URL or unreachable): ${msg}`
        : `CRITICAL: ${msg}`,
    };
  }
}

function collectBanned(): { found: string[]; passed: boolean } {
  const pkg = readPackageJson();
  if (!pkg) return { found: [], passed: true };
  const all: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };
  const found = BANNED_PACKAGES.filter((name) => name in all);
  return { found, passed: found.length === 0 };
}

function writeReport(report: unknown): void {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
}

async function main(): Promise<number> {
  loadEnv();
  const mode = parseMode(process.argv.slice(2));

  const nodeRaw = process.version;
  const nodeNum = nodeRaw.replace(/^v/, "");
  const nodeOk = gteVersion(nodeNum, "20.0.0");

  const {
    entries: envVars,
    allOk: envOk,
    requiredKeys,
  } = validateEnvVarsForMode(mode);

  const nextVer = readInstalledPackageVersion("next");
  const nextOk =
    nextVer != null &&
    gteVersion(nextVer, "14.2.0");
  const nextDetail =
    nextVer == null ? "Next.js not installed" : `next@${nextVer}`;

  const nuqsVer = readInstalledPackageVersion("nuqs");
  const nuqsOk =
    nuqsVer != null &&
    gteVersion(nuqsVer, "1.17.0");
  const nuqsDetail =
    nuqsVer == null
      ? "nuqs not installed — required for App Router searchParams"
      : `nuqs@${nuqsVer}`;

  const cfg = findNextConfigText();
  const cloudinary =
    cfg != null &&
    cfg.includes("res.cloudinary.com");
  const ytimg =
    cfg != null && cfg.includes("i.ytimg.com");
  const remoteOk = cloudinary && ytimg;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  let supabaseConnection: {
    statusCode: number | null;
    passed: boolean;
    detail: string;
  } = {
    statusCode: null,
    passed: false,
    detail: "Skipped (missing SUPABASE_URL or SUPABASE_ANON_KEY)",
  };
  if (mode === "strict" && supabaseUrl && anonKey) {
    supabaseConnection = await supabaseSmoke(supabaseUrl, anonKey);
  } else if (mode === "build") {
    supabaseConnection = {
      statusCode: null,
      passed: true,
      detail: "Skipped in build mode (fast env contract check only)",
    };
  }

  const bannedPackages = collectBanned();

  const fatalsOk = (
    mode === "build"
      ? nodeOk && envOk
      : nodeOk &&
        envOk &&
        remoteOk &&
        supabaseConnection.passed &&
        bannedPackages.passed
  );

  const allPassed =
    fatalsOk &&
    nextOk &&
    nuqsOk;

  const report = {
    nodeVersion: { value: nodeRaw, passed: nodeOk },
    envVars,
    nextVersion: { value: nextVer ?? "", passed: nextOk },
    nuqsVersion: { value: nuqsVer, passed: nuqsOk },
    remotePatterns: {
      cloudinary,
      ytimg,
      passed: remoteOk,
    },
    supabaseConnection,
    bannedPackages: {
      found: bannedPackages.found,
      passed: bannedPackages.passed,
    },
    allPassed,
  };

  writeReport(report);

  console.log("\n--- Build environment validation ---");
  console.log(`Mode: ${mode}`);
  console.log(
    `Node ${nodeRaw}: ${nodeOk ? "PASS" : "FAIL"} (need >= 20.0.0)`
  );
  console.log(`Env vars: ${envOk ? "PASS" : "FAIL"} (required: ${requiredKeys.join(", ")})`);
  for (const [name, e] of Object.entries(envVars)) {
    const required = requiredKeys.includes(name);
    if (required && (!e.present || !e.formatValid)) {
      console.log(
        `  ${name}: present=${e.present} formatValid=${e.formatValid} (required)`
      );
    } else if (!required && (!e.present || !e.formatValid)) {
      console.log(
        `  ${name}: present=${e.present} formatValid=${e.formatValid} (optional in ${mode} mode)`
      );
    }
  }
  console.log(`Next.js: ${nextOk ? "PASS" : "WARN — " + nextDetail}`);
  console.log(`nuqs: ${nuqsOk ? "PASS" : "WARN — " + nuqsDetail}`);
  if (mode === "strict") {
    console.log(
      `remotePatterns (Cloudinary + ytimg): ${remoteOk ? "PASS" : "FAIL"}`
    );
    if (!remoteOk) {
      console.log(
        "  CRITICAL: next.config must contain res.cloudinary.com and i.ytimg.com"
      );
    }
  } else {
    console.log("remotePatterns (Cloudinary + ytimg): SKIP in build mode");
  }
  console.log(
    `Supabase REST: ${supabaseConnection.passed ? "PASS" : "FAIL"} — ${supabaseConnection.detail}`
  );
  if (mode === "strict") {
    console.log(
      `Banned packages: ${bannedPackages.passed ? "PASS" : "CRITICAL FAIL"}`
    );
    if (!bannedPackages.passed) {
      console.log(`  Found: ${bannedPackages.found.join(", ")}`);
    }
  } else {
    console.log("Banned packages: SKIP in build mode");
  }
  console.log(`Overall (${mode}): ${allPassed ? "ALL PASS" : "ISSUES"}`);
  console.log(`Fatals (exit): ${fatalsOk ? "PASS" : "FAIL"}`);
  console.log(`Report: ${REPORT_PATH}\n`);

  return fatalsOk ? 0 : 1;
}

main()
  .then((c) => process.exit(c))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
