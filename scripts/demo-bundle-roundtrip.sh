#!/usr/bin/env bash
# Grid Passport signed-bundle end-to-end demonstration.
#
# Orders a single visible drama:
#   1. TS signer emits a freshly-signed bundle + pubkey to disk
#   2. TS verifier CLI checks the bundle → PASS
#   3. Python reference verifier checks the bundle → PASS
#   4. Flip one byte inside the payload
#   5. TS verifier rejects → FAIL
#   6. Python verifier rejects → FAIL
#
# All four checks must report the expected outcome for the script to
# exit 0. Wire this into CI as the portability gate.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT="${GP_BUNDLE_OUT:-/tmp/gp-demo-bundle}"
CASE_ID="${GP_CASE_ID:-owl-compute}"

echo "=== Grid Passport signed-bundle roundtrip demo ==="
echo "    out dir: ${OUT}"
echo "    case:    ${CASE_ID}"
echo

echo "--- 1. TS signer emits fixture ---"
pnpm --filter @grid-passport/verifier exec tsx scripts/emit-fixture.ts "${OUT}" "${CASE_ID}"
echo

echo "--- 2. TS verifier checks bundle (expect PASS) ---"
pnpm --silent --filter @grid-passport/verifier exec tsx bin/verify.js "${OUT}/bundle.json" "${OUT}/pubkey.b64" \
  || { echo "✘ TS verifier rejected a valid bundle (bug)"; exit 1; }
echo

echo "--- 3. Python verifier checks bundle (expect PASS) ---"
python3 apps/verifier-py/grid_passport_verifier.py "${OUT}/bundle.json" "${OUT}/pubkey.b64" \
  || { echo "✘ Python verifier rejected a valid bundle (cross-impl drift)"; exit 1; }
echo

echo "--- 4. Flip one byte in payload ---"
cp "${OUT}/bundle.json" "${OUT}/tampered.json"
python3 -c "
import json, sys
with open('${OUT}/tampered.json') as f: b = json.load(f)
b['payload']['caseId'] = 'TAMPERED'
with open('${OUT}/tampered.json','w') as f: json.dump(b, f, indent=2)
print('  flipped caseId -> TAMPERED')
"
echo

echo "--- 5. TS verifier rejects tampered (expect FAIL) ---"
if pnpm --silent --filter @grid-passport/verifier exec tsx bin/verify.js "${OUT}/tampered.json" "${OUT}/pubkey.b64" 2>&1; then
  echo "✘ TS verifier accepted a tampered bundle (critical bug)"
  exit 1
fi
echo "  ✔ TS correctly rejected"
echo

echo "--- 6. Python verifier rejects tampered (expect FAIL) ---"
if python3 apps/verifier-py/grid_passport_verifier.py "${OUT}/tampered.json" "${OUT}/pubkey.b64" 2>&1; then
  echo "✘ Python verifier accepted a tampered bundle (critical bug)"
  exit 1
fi
echo "  ✔ Python correctly rejected"
echo


# --------------------------------------------------------------------
# 3-way parity: Rust signer → TS + Python verifiers
# --------------------------------------------------------------------
GP_SIGN="apps/desktop/src-tauri/target/debug/gp-sign"
if [ ! -x "${GP_SIGN}" ]; then
  echo "--- 7. building gp-sign Rust binary ---"
  ( cd apps/desktop/src-tauri && cargo build --bin gp-sign --quiet )
fi

echo "--- 7. Rust signer produces a bundle (expect PASS) ---"
"${GP_SIGN}" "${OUT}/payload.json" "${OUT}/secret.b64" > "${OUT}/rust-signed.json"
echo "  ✔ Rust-signed bundle written to ${OUT}/rust-signed.json"
echo

echo "--- 8. TS verifier on Rust-signed bundle (expect PASS) ---"
pnpm --silent --filter @grid-passport/verifier exec tsx bin/verify.js "${OUT}/rust-signed.json" "${OUT}/pubkey.b64" \
  || { echo "✘ TS verifier rejected a Rust-signed bundle (cross-impl drift)"; exit 1; }
echo

echo "--- 9. Python verifier on Rust-signed bundle (expect PASS) ---"
python3 apps/verifier-py/grid_passport_verifier.py "${OUT}/rust-signed.json" "${OUT}/pubkey.b64" \
  || { echo "✘ Python verifier rejected a Rust-signed bundle (cross-impl drift)"; exit 1; }
echo

echo "--- 10. Tamper Rust-signed bundle, both verifiers reject (expect FAIL × 2) ---"
cp "${OUT}/rust-signed.json" "${OUT}/rust-tampered.json"
python3 -c "
import json
with open('${OUT}/rust-tampered.json') as f: b = json.load(f)
b['payload']['issuer']['label'] = 'NOT_THE_APPLICANT'
with open('${OUT}/rust-tampered.json','w') as f: json.dump(b, f, indent=2)
"
if pnpm --silent --filter @grid-passport/verifier exec tsx bin/verify.js "${OUT}/rust-tampered.json" "${OUT}/pubkey.b64" 2>&1; then
  echo "✘ TS verifier accepted tampered Rust-signed bundle (critical)"
  exit 1
fi
if python3 apps/verifier-py/grid_passport_verifier.py "${OUT}/rust-tampered.json" "${OUT}/pubkey.b64" 2>&1; then
  echo "✘ Python verifier accepted tampered Rust-signed bundle (critical)"
  exit 1
fi
echo "  ✔ both verifiers correctly rejected Rust-signed tamper"
echo

echo "=== Roundtrip OK: TS ⇌ Rust ⇌ Python agree on valid + tampered bundles ==="
