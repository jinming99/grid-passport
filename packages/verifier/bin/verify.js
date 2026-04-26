#!/usr/bin/env node
// Thin CLI wrapper. Keep logic in src/index.ts so the same code path
// is used by programmatic callers and the command line.
import { readFileSync } from "node:fs";
import { verifyBundle } from "../src/index.ts";

function usage() {
  process.stderr.write(
    "usage: grid-passport-verify <bundle.json> <pubkey.b64|pubkey.hex>\n",
  );
  process.exit(2);
}

async function main() {
  const [bundlePath, keyPath] = process.argv.slice(2);
  if (!bundlePath || !keyPath) usage();

  const bundle = readFileSync(bundlePath, "utf8");
  const rawKey = readFileSync(keyPath, "utf8").trim();

  let pubkey;
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    pubkey = Uint8Array.from(Buffer.from(rawKey, "hex"));
  } else {
    pubkey = Uint8Array.from(Buffer.from(rawKey, "base64"));
  }
  if (pubkey.length !== 32) {
    process.stderr.write(
      `public key must be 32 bytes (got ${pubkey.length})\n`,
    );
    process.exit(2);
  }

  const result = await verifyBundle(bundle, pubkey);
  if (result.ok) {
    process.stdout.write(
      `[verify] ok · keyId=${result.payload?.issuer.keyId} · ${result.payload?.auditChain.length} audit events\n`,
    );
    process.stdout.write(`  policy.rego    ${result.payload?.policyHash.rego}\n`);
    process.stdout.write(`  policy.runtime ${result.payload?.policyHash.runtime}\n`);
    process.exit(0);
  }
  process.stderr.write(`[verify] FAILED · ${result.reasons.length} reason(s):\n`);
  for (const r of result.reasons) process.stderr.write(`  - ${r}\n`);
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`[verify] unexpected error: ${err}\n`);
  process.exit(2);
});
