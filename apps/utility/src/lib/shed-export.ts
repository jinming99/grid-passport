import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import {
  newBundleId,
  signBundle,
  type DisclosureBundle,
  type ShedRequestPayload,
} from "@grid-passport/core/bundle";
import { utilitySigner } from "./utility-signer";

/**
 * Build + sign a `shed_request` bundle and write it to a user-chosen
 * path. Mirrors the disclosure export on the desktop side, but signs
 * with the utility's key and ships a `ShedRequestPayload` instead of
 * projections + audit chain.
 */
export async function buildAndSignShedRequest(input: {
  caseId: string;
  requestId: string;
  issuerLabel: string;
  shedRequest: ShedRequestPayload;
}): Promise<DisclosureBundle> {
  const signer = await utilitySigner();
  return signBundle(
    {
      bundleId: newBundleId(),
      caseId: input.caseId,
      requestId: input.requestId,
      issuerLabel: input.issuerLabel,
      // Utility doesn't carry a runtime POLICY mirror today — stamp the
      // version string only. Real coordination protocol would pin a
      // utility-side policy hash here too.
      policyHash: {
        rego: "sha256:utility-v0",
        runtime: "sha256:utility-v0",
      },
      policyVersion: "grid-passport-policy@0.1.0",
      kind: "shed_request",
      shedRequest: input.shedRequest,
    },
    signer,
  );
}

export async function exportShedRequest(
  bundle: DisclosureBundle,
): Promise<{ path: string } | null> {
  const sr = bundle.payload.shedRequest;
  // File-name convention: `<pocket>-shed-<windowStart-date>.json` for
  // legibility on disk. Falls back to bundleId-based name if shedRequest
  // is somehow missing (defensive).
  const dateLabel =
    sr?.windowStart?.slice(0, 10) ?? bundle.payload.issuedAt.slice(0, 10);
  const pocketLabel = (sr?.pocket ?? "shed").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = await save({
    defaultPath: `${pocketLabel}-shed-${dateLabel}.json`,
    filters: [{ name: "Grid Passport Bundle", extensions: ["json"] }],
  });
  if (!path) return null;
  await writeTextFile(path, JSON.stringify(bundle, null, 2));
  return { path };
}
