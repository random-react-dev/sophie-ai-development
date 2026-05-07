#!/usr/bin/env -S npx tsx
// IAP local config audit.
//
// Verifies the SKUs, bundle ID, and plugin wiring across the four sources of
// truth: app.config.ts, services/iap/client.ts, package.json, and
// docs/APPSTORECONNECT_IAP_SETUP.md.
//
// Usage:  npx tsx scripts/audit-iap-config.ts
//
// Read-only — no file writes, no network calls. Exits 0 if every local check
// passes, 1 if a local check fails.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

type CheckResult = {
  label: string;
  ok: boolean;
  detail: string;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

function check(label: string, ok: boolean, detail: string): CheckResult {
  return { label, ok, detail };
}

const EXPECTED_BUNDLE_ID = "ai.speakwithsophie.app";
const EXPECTED_SKUS: readonly string[] = [
  "ai.speakwithsophie.app.premium.monthly",
  "ai.speakwithsophie.app.premium.semiannual",
];

type AppVersionInfo = {
  version: string;
  iosBuildNumber: string;
  androidVersionCode: string;
};

function readAppVersionInfo(src: string): AppVersionInfo {
  const version = src.match(/version:\s*["']([^"']+)["']/)?.[1] ?? "unknown";
  const iosBuildNumber =
    src.match(/buildNumber:\s*["']([^"']+)["']/)?.[1] ?? "unknown";
  const androidVersionCode =
    src.match(/versionCode:\s*(\d+)/)?.[1] ?? "unknown";

  return { version, iosBuildNumber, androidVersionCode };
}

function auditAppConfig(): { results: CheckResult[]; versionInfo: AppVersionInfo } {
  const src = read("app.config.ts");
  const bundleMatch = src.match(/bundleIdentifier:\s*["']([^"']+)["']/);
  const bundleOk = bundleMatch?.[1] === EXPECTED_BUNDLE_ID;
  const pluginOk = /["']react-native-iap["']/.test(src);
  const versionInfo = readAppVersionInfo(src);
  const versionOk =
    versionInfo.version !== "unknown" && versionInfo.iosBuildNumber !== "unknown";

  return {
    versionInfo,
    results: [
      check(
        `app.config.ts -> ios.bundleIdentifier = ${EXPECTED_BUNDLE_ID}`,
        bundleOk,
        bundleMatch ? `found "${bundleMatch[1]}"` : "bundleIdentifier not found",
      ),
      check(
        `app.config.ts -> ios version/build ready for App Review`,
        versionOk,
        `found version "${versionInfo.version}", build "${versionInfo.iosBuildNumber}"`,
      ),
      check(
        `app.config.ts -> android versionCode ready for Play upload`,
        versionInfo.androidVersionCode !== "unknown",
        `found versionCode "${versionInfo.androidVersionCode}"`,
      ),
      check(
        `app.config.ts -> plugins includes "react-native-iap"`,
        pluginOk,
        pluginOk ? "found" : "plugin string not found",
      ),
    ],
  };
}

function auditClient(): CheckResult[] {
  const src = read("services/iap/client.ts");
  const skusOk = EXPECTED_SKUS.every((sku) => src.includes(`"${sku}"`));
  const prefixOk = EXPECTED_SKUS.every((sku) =>
    sku.startsWith(`${EXPECTED_BUNDLE_ID}.`),
  );
  return [
    check(
      `services/iap/client.ts -> PRODUCT_IDS contains both expected SKUs`,
      skusOk,
      skusOk ? "both SKUs present" : "missing one or both SKUs in code",
    ),
    check(
      `services/iap/client.ts -> SKU prefix matches bundle ID`,
      prefixOk,
      prefixOk ? "ok" : "SKU prefix does not match bundle ID",
    ),
  ];
}

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function auditPackage(): CheckResult[] {
  const pkg = JSON.parse(read("package.json")) as PackageJson;
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const ver = deps["react-native-iap"];
  const ok = typeof ver === "string" && /^[~^]?15\./.test(ver);
  return [
    check(
      `package.json -> react-native-iap = 15.x`,
      ok,
      typeof ver === "string" ? `found "${ver}"` : "not installed",
    ),
  ];
}

function auditAdminDoc(): CheckResult[] {
  const src = read("docs/APPSTORECONNECT_IAP_SETUP.md");
  const ok = EXPECTED_SKUS.every((sku) => src.includes(sku));
  return [
    check(
      `docs/APPSTORECONNECT_IAP_SETUP.md -> product IDs match code`,
      ok,
      ok ? "both SKUs documented" : "missing SKU in admin doc",
    ),
  ];
}

function appleChecklist(versionInfo: AppVersionInfo): readonly string[] {
  const versionLabel = `${versionInfo.version} (${versionInfo.iosBuildNumber})`;

  return [
    "Paid Apps Agreement = Active (Business -> Agreements)",
    "Tax forms = Active",
    "Bank Account = Active (NOT Pending)",
    `Subscription Group reference "Sophie Premium" has English (U.S.) display name "Sophie AI Premium"`,
    `Monthly and semiannual product localizations are not Rejected or Missing Metadata`,
    `A new iOS build ${versionLabel} is uploaded and selected on the ${versionInfo.version} version page`,
    `Review submission contains 3 items: iOS App ${versionInfo.version}, monthly subscription, semiannual subscription`,
    "Sandbox tester signed in on simulator (Settings -> App Store)",
  ];
}

function format(results: readonly CheckResult[]): string {
  return results
    .map(
      (r) =>
        `[${r.ok ? "OK" : "!!"}]  ${r.label}${r.ok ? "" : ` -- ${r.detail}`}`,
    )
    .join("\n");
}

function main(): void {
  const appConfig = auditAppConfig();
  const local = [
    ...appConfig.results,
    ...auditClient(),
    ...auditPackage(),
    ...auditAdminDoc(),
  ];
  console.log("IAP local config audit");
  console.log("======================");
  console.log(format(local));
  console.log();
  console.log("Apple-side checklist (verify manually in App Store Connect):");
  for (const item of appleChecklist(appConfig.versionInfo)) {
    console.log(`[ ]  ${item}`);
  }
  const failed = local.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} local check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll local checks passed.");
}

main();
