//! `gp-sign` — standalone Rust signer for cross-implementation parity.
//!
//! Reads a payload JSON document and a 32-byte Ed25519 secret key
//! (base64-encoded), canonicalizes the payload via RFC 8785 JCS, signs
//! with ed25519-dalek, and emits the complete bundle envelope to stdout.
//!
//! Proves that the Rust signing primitive used by the Tauri app produces
//! bytes verifiable by the TypeScript verifier (@grid-passport/verifier)
//! and the Python reference verifier (apps/verifier-py). Called from
//! scripts/demo-bundle-roundtrip.sh in the 3-way parity stage.
//!
//! Usage:
//!     gp-sign <payload.json> <secret.b64> > bundle.json
//!
//! Note: this binary does not touch the OS keychain. The keychain path is
//! exercised separately by the unit test in src/signer.rs.

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use ed25519_dalek::{Signer, SigningKey};
use serde_json::json;
use std::fs;
use std::process;

const SCHEMA: &str = "grid-passport/bundle";
const VERSION: &str = "1.0.0";
const ALG: &str = "Ed25519";

fn die(msg: &str) -> ! {
    eprintln!("[gp-sign] {}", msg);
    process::exit(2);
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 {
        eprintln!("usage: gp-sign <payload.json> <secret.b64>");
        process::exit(2);
    }

    let payload_text = fs::read_to_string(&args[1]).unwrap_or_else(|e| die(&format!("read payload: {e}")));
    let secret_text = fs::read_to_string(&args[2]).unwrap_or_else(|e| die(&format!("read secret: {e}")));

    let secret_bytes = BASE64
        .decode(secret_text.trim())
        .unwrap_or_else(|e| die(&format!("secret not base64: {e}")));
    if secret_bytes.len() != 32 {
        die(&format!("secret must be 32 bytes; got {}", secret_bytes.len()));
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&secret_bytes);
    let signing = SigningKey::from_bytes(&arr);

    let payload: serde_json::Value =
        serde_json::from_str(&payload_text).unwrap_or_else(|e| die(&format!("payload not valid JSON: {e}")));

    let canonical = serde_json_canonicalizer::to_string(&payload)
        .unwrap_or_else(|e| die(&format!("JCS canonicalization failed: {e}")));

    let sig = signing.sign(canonical.as_bytes());
    let sig_b64 = BASE64.encode(sig.to_bytes());

    let bundle = json!({
        "schema": SCHEMA,
        "version": VERSION,
        "payload": payload,
        "signature": { "alg": ALG, "value": sig_b64 }
    });

    match serde_json::to_string_pretty(&bundle) {
        Ok(s) => println!("{}", s),
        Err(e) => die(&format!("serialize bundle: {e}")),
    }
}
