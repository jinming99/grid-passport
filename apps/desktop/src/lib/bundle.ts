import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { CaseInput, Role } from "@grid-passport/core/types";
import type { ProjectedView } from "@grid-passport/core/projection";

export interface DisclosureBundle {
  schema: "grid-passport/bundle";
  version: "0.0.1-v0";
  caseId: string;
  requestId: string;
  policyVersion: string;
  generatedAt: string;
  projections: Record<Role, ProjectedView>;
  note: string;
}

export function buildBundle(
  input: CaseInput,
  projections: Record<Role, ProjectedView>,
): DisclosureBundle {
  return {
    schema: "grid-passport/bundle",
    version: "0.0.1-v0",
    caseId: input.caseId,
    requestId: input.id,
    policyVersion: input.policyVersion,
    generatedAt: new Date().toISOString(),
    projections,
    // Audit chain + Ed25519 signature land in #6 (signed disclosure bundle
    // protocol). v0 exports are for local inspection only — not verifiable.
    note:
      "v0 disclosure draft. Signed audit chain + signature arrive in #6 (signed bundle protocol). Do not rely on this bundle for production disclosure.",
  };
}

export async function exportBundle(
  bundle: DisclosureBundle,
): Promise<{ path: string } | null> {
  const path = await save({
    defaultPath: `${bundle.caseId}-bundle.json`,
    filters: [{ name: "Grid Passport Bundle", extensions: ["json"] }],
  });
  if (!path) return null;
  await writeTextFile(path, JSON.stringify(bundle, null, 2));
  return { path };
}
