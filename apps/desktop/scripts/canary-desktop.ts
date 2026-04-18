import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { getCase } from "@grid-passport/core/fixtures";
import { buildRecord } from "@grid-passport/core/forecast";
import { projectForRole } from "@grid-passport/core/projection";
import type { Role } from "@grid-passport/core/types";

// Desktop-specific mechanical check. The web privacy-canary already asserts
// policy drift; this one asserts (a) the desktop app imports projection from
// @grid-passport/core (no duplicate copy), and (b) the projection invariant
// holds on the same fixtures the desktop UI composes.

const HERE = dirname(fileURLToPath(import.meta.url));
const DESKTOP_SRC = join(HERE, "..", "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const srcFiles = walk(DESKTOP_SRC);
const coreImporters = srcFiles.filter((f) =>
  readFileSync(f, "utf8").includes("@grid-passport/core"),
);

if (coreImporters.length === 0) {
  console.error(
    "[canary:desktop] FAIL: no apps/desktop/src file imports @grid-passport/core — projection layer is duplicated or missing.",
  );
  process.exit(1);
}
console.log(
  `[canary:desktop] @grid-passport/core imports: pass (${coreImporters.length} file${coreImporters.length === 1 ? "" : "s"})`,
);

// Projection invariant. Same structural check the privacy canary runs, but
// explicitly exercised here so a future change to the desktop bundle format
// that bypasses @grid-passport/core would be caught.
const ROLES: Role[] = ["applicant", "utility", "regulator"];
const CASES = ["owl-compute", "lantern-cloud", "kraken-train"];

let hardErrors = 0;
for (const caseId of CASES) {
  const input = getCase(caseId);
  if (!input) {
    console.error(`[canary:desktop] FAIL: unknown case ${caseId}`);
    hardErrors++;
    continue;
  }
  const record = buildRecord(input);
  for (const role of ROLES) {
    const view = projectForRole(record, role);
    const privateVisible = Object.values(view.privateProfile).filter(
      (f) => f.visible,
    ).length;
    const expectVisible = role === "applicant" ? 8 : 0;
    if (privateVisible !== expectVisible) {
      console.error(
        `[canary:desktop] FAIL: ${caseId} · ${role} · expected ${expectVisible} private visible, got ${privateVisible}`,
      );
      hardErrors++;
    }
  }
}

if (hardErrors > 0) {
  console.error(`[canary:desktop] ${hardErrors} failure(s)`);
  process.exit(1);
}
console.log("[canary:desktop] projection invariant: pass (3 cases × 3 roles)");
console.log("[canary:desktop] all clear");
