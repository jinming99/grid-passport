import { invoke } from "@tauri-apps/api/core";
import { base64ToBytes } from "@grid-passport/core/crypto";
import type { BundleSigner } from "@grid-passport/core/bundle";

/**
 * Tauri-backed BundleSigner.
 *
 * Calls two Rust commands (apps/desktop/src-tauri/src/signer.rs):
 *   - `applicant_public_key` → base64 Ed25519 public key
 *   - `applicant_sign`       → base64 Ed25519 signature over the given bytes
 *
 * The private key is stored in the OS keychain and never crosses the
 * Tauri IPC boundary. See docs/design/signed-bundle.md §3.4.
 */
export async function tauriSigner(): Promise<BundleSigner> {
  const pubB64 = await invoke<string>("applicant_public_key");
  const publicKey = base64ToBytes(pubB64);
  if (publicKey.length !== 32) {
    throw new Error(`unexpected public key length: ${publicKey.length}`);
  }
  return {
    publicKey,
    async sign(message: Uint8Array): Promise<Uint8Array> {
      const sigB64 = await invoke<string>("applicant_sign", {
        message: Array.from(message),
      });
      const sig = base64ToBytes(sigB64);
      if (sig.length !== 64) {
        throw new Error(`unexpected signature length: ${sig.length}`);
      }
      return sig;
    },
  };
}
