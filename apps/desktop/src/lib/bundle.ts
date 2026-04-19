import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { buildAuditTrail } from "@grid-passport/core/audit";
import { buildRecord } from "@grid-passport/core/forecast";
import { sha256Hex, jcs } from "@grid-passport/core/crypto";
import { POLICY, POLICY_VERSION } from "@grid-passport/core/policy";
import {
  newBundleId,
  signBundle,
  type DisclosureBundle,
} from "@grid-passport/core/bundle";
import type { CaseInput, Role } from "@grid-passport/core/types";
import type { ProjectedView } from "@grid-passport/core/projection";
import { tauriSigner } from "./signer";

/**
 * Build + sign a disclosure bundle v1 from a loaded case, using the
 * applicant's OS-keychain-backed Ed25519 key via Tauri IPC.
 * Spec: docs/design/signed-bundle.md.
 */
export async function buildAndSignBundle(
  input: CaseInput,
  projections: Record<Role, ProjectedView>,
  issuerLabel: string,
): Promise<DisclosureBundle> {
  const record = buildRecord(input);
  const auditChain = await buildAuditTrail(input, record, "utility", undefined);

  // Dual policy hash (D-6). Runtime = hash of JCS(POLICY table).
  // `rego` hash is left as a known placeholder in the desktop build because
  // Vite cannot ship the .rego file as a loadable asset without extra plumbing;
  // it will be computed from the bundled Rego file once we add asset loading
  // (tracked in roadmap).
  const runtimeHash = await sha256Hex(jcs(POLICY));
  const policyHash = {
    rego: "sha256:unknown-desktop-v0",
    runtime: `sha256:${runtimeHash}`,
  };

  const signer = await tauriSigner();

  return signBundle(
    {
      bundleId: newBundleId(),
      caseId: input.caseId,
      requestId: input.id,
      issuerLabel,
      policyHash,
      policyVersion: POLICY_VERSION,
      projections,
      auditChain,
    },
    signer,
  );
}

export async function exportBundle(
  bundle: DisclosureBundle,
): Promise<{ path: string } | null> {
  const path = await save({
    defaultPath: `${bundle.payload.caseId}-bundle.json`,
    filters: [{ name: "Grid Passport Bundle", extensions: ["json"] }],
  });
  if (!path) return null;
  await writeTextFile(path, JSON.stringify(bundle, null, 2));
  return { path };
}
