import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { verifyBundle, type VerifyResult } from "@grid-passport/verifier";

/**
 * Loader for utility-side coordination messages (Act 3).
 *
 * Mirrors `apps/utility/src/lib/bundle-loader.ts` byte-for-byte at the
 * UX level: the applicant pastes the utility's pinned public key, picks
 * a `shed-request.json` (or future `acknowledgment.json`) from disk,
 * and gets a tagged result back. The verifier rejects on bad signature
 * or wrong issuer.
 *
 * Same trust model as the Act 2 inbound-disclosure path on the utility
 * side: SSH-known-hosts. The applicant pre-pins Dominion's pubkey once,
 * then verifies any message signed with the matching private key.
 */

export class UtilityMessageLoaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UtilityMessageLoaderError";
  }
}

export type UtilityMessageLoadResult =
  | { kind: "cancelled" }
  | {
      kind: "loaded";
      path: string;
      rawJson: string;
      verify: VerifyResult;
    }
  | { kind: "error"; message: string };

function decodePublicKey(b64: string): Uint8Array {
  const trimmed = b64.trim();
  if (trimmed.length === 0) {
    throw new UtilityMessageLoaderError("public key is empty");
  }
  const bin = atob(trimmed);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  if (out.length !== 32) {
    throw new UtilityMessageLoaderError(
      `public key must decode to 32 bytes (got ${out.length}); check the base64`,
    );
  }
  return out;
}

export async function loadAndVerifyUtilityMessage(
  pubKeyB64: string,
): Promise<UtilityMessageLoadResult> {
  let pubKey: Uint8Array;
  try {
    pubKey = decodePublicKey(pubKeyB64);
  } catch (err) {
    return {
      kind: "error",
      message:
        err instanceof UtilityMessageLoaderError
          ? err.message
          : `public-key decode failed: ${(err as Error).message}`,
    };
  }

  let selected: string | string[] | null;
  try {
    selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Grid Passport Bundle", extensions: ["json"] }],
    });
  } catch (err) {
    return {
      kind: "error",
      message: `dialog failed: ${(err as Error).message}`,
    };
  }
  if (selected === null) return { kind: "cancelled" };
  const path = typeof selected === "string" ? selected : null;
  if (!path) {
    return {
      kind: "error",
      message: "dialog returned an unrecognized path shape",
    };
  }

  let rawJson: string;
  try {
    rawJson = await readTextFile(path);
  } catch (err) {
    return {
      kind: "error",
      message: `failed to read file: ${(err as Error).message}`,
    };
  }

  let verify: VerifyResult;
  try {
    verify = await verifyBundle(rawJson, pubKey);
  } catch (err) {
    return {
      kind: "error",
      message: `verifier threw: ${(err as Error).message}`,
    };
  }

  return { kind: "loaded", path, rawJson, verify };
}
