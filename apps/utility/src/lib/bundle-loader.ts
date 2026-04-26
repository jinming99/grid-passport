import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { verifyBundle, type VerifyResult } from "@grid-passport/verifier";

/**
 * Bundle-loader for the utility-side binary. Exposes a single function that
 * drives the file-picker → readTextFile → verifyBundle chain, returning
 * either a successful verify-result or a structured error.
 *
 * Webview-safe; only imports `@tauri-apps/plugin-dialog` + `plugin-fs` +
 * `@grid-passport/verifier`. No `@grid-passport/core/{fixtures,forecast,
 * audit}` — the utility write-scope guard enforces this at the import
 * graph.
 */

export class BundleLoaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleLoaderError";
  }
}

export type BundleLoadResult =
  | { kind: "cancelled" }
  | {
      kind: "loaded";
      path: string;
      rawJson: string;
      verify: VerifyResult;
    }
  | { kind: "error"; message: string };

/**
 * Decode a base64 public key string into a 32-byte Uint8Array. Accepts
 * standard base64 (with or without trailing '=').
 */
function decodePublicKey(b64: string): Uint8Array {
  const trimmed = b64.trim();
  if (trimmed.length === 0) {
    throw new BundleLoaderError("public key is empty");
  }
  const bin = atob(trimmed);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  if (out.length !== 32) {
    throw new BundleLoaderError(
      `public key must decode to 32 bytes (got ${out.length}); check the base64`,
    );
  }
  return out;
}

/**
 * Open the Tauri dialog, let the user pick a .json bundle, read it, and
 * verify against the supplied public key. All failure modes surface as a
 * tagged result; the caller renders the right UI branch.
 */
export async function loadAndVerifyBundle(
  pubKeyB64: string,
): Promise<BundleLoadResult> {
  let pubKey: Uint8Array;
  try {
    pubKey = decodePublicKey(pubKeyB64);
  } catch (err) {
    return {
      kind: "error",
      message:
        err instanceof BundleLoaderError
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
