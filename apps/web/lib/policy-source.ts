import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface PolicySource {
  text: string;
  sha256: string;
  path: string;
  lineCount: number;
}

let cached: PolicySource | null = null;

export async function loadPolicySource(): Promise<PolicySource> {
  if (cached) return cached;
  const rel = "../../packages/policy/grid-passport.rego";
  const abs = join(process.cwd(), rel);
  const text = await readFile(abs, "utf8");
  const sha256 = createHash("sha256").update(text).digest("hex");
  cached = {
    text,
    sha256,
    path: "packages/policy/grid-passport.rego",
    lineCount: text.split("\n").length,
  };
  return cached;
}
