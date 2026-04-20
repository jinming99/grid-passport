/**
 * Hash-chain + policy-binding tests for audit.ts.
 *
 * The privacy canary (`pnpm privacy:canary`) checks that audit *actions* never
 * contain raw private values. These tests check the *integrity* invariants:
 * the seq+prevHash chain is well-formed and tamper-evident, the policy hash
 * is bound to every event, and override rows land in the right place with the
 * right redaction.
 *
 * Track 4 of sprint 2026-04-20. Spec: docs/plans/sprint-2026-04-20.md §4.1.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAuditTrail } from "./audit.ts";
import { buildRecord } from "./forecast.ts";
import { POLICY_VERSION } from "./policy.ts";
import { getCase } from "./fixtures/index.ts";
import { sha256Hex } from "./crypto.ts";
import type { Role } from "./types.ts";

const owl = getCase("owl-compute")!;
const lantern = getCase("lantern-cloud")!;

async function trailFor(
  caseInput = owl,
  role: Role = "utility",
  override?: { flexPercent: number },
) {
  const rec = buildRecord(caseInput, override);
  return buildAuditTrail(caseInput, rec, role, override);
}

// ---------------------------------------------------------------------------
// Hash-chain linkage
// ---------------------------------------------------------------------------

test("audit: seq is 1-indexed and strictly monotonic", async () => {
  const trail = await trailFor();
  assert.ok(trail.length > 0);
  for (let i = 0; i < trail.length; i++) {
    assert.equal(trail[i].seq, i + 1, `seq at index ${i} is ${trail[i].seq}`);
  }
});

test("audit: first event has prevHash = null; rest have sha256:<hex>", async () => {
  const trail = await trailFor();
  assert.equal(trail[0].prevHash, null);
  for (let i = 1; i < trail.length; i++) {
    assert.ok(
      trail[i].prevHash !== null,
      `event ${i} has null prevHash — chain broken`,
    );
    assert.match(
      trail[i].prevHash!,
      /^sha256:[0-9a-f]{64}$/,
      `event ${i} prevHash has wrong shape: ${trail[i].prevHash}`,
    );
  }
});

test("audit: prevHash[i] === sha256(JCS(event[i-1])) — chain is well-formed", async () => {
  const trail = await trailFor();
  for (let i = 1; i < trail.length; i++) {
    const expected = `sha256:${await sha256Hex(trail[i - 1])}`;
    assert.equal(
      trail[i].prevHash,
      expected,
      `prevHash mismatch at seq ${trail[i].seq}`,
    );
  }
});

test("audit: tamper with a prior event → prevHash no longer validates", async () => {
  const trail = await trailFor();
  assert.ok(trail.length >= 3);
  // Mutate the details of event[1] (an already-committed, non-last event).
  const tampered = {
    ...trail[1],
    details: { ...trail[1].details, sourceCount: 9999 },
  };
  const expectedAfterTamper = `sha256:${await sha256Hex(tampered)}`;
  // The chain as-is binds to the *original* event[1], not the tampered one.
  assert.notEqual(
    trail[2].prevHash,
    expectedAfterTamper,
    "prevHash should not match a tampered prior event",
  );
});

// ---------------------------------------------------------------------------
// Policy-hash binding
// ---------------------------------------------------------------------------

test("audit: every event carries a non-empty policyVersion", async () => {
  const trail = await trailFor();
  for (const e of trail) {
    assert.ok(
      typeof e.policyVersion === "string" && e.policyVersion.length > 0,
      `seq ${e.seq} has empty policyVersion`,
    );
  }
});

test("audit: forecaster + referee rows bind to the runtime POLICY_VERSION", async () => {
  const trail = await trailFor();
  for (const e of trail) {
    if (e.actor === "forecaster" || e.actor === "referee") {
      assert.equal(
        e.policyVersion,
        POLICY_VERSION,
        `${e.actor} seq ${e.seq} should bind to runtime POLICY_VERSION`,
      );
    }
  }
});

test("audit: input-anchored rows (interviewer/cartographer/notary) bind to input.policyVersion", async () => {
  const trail = await trailFor();
  for (const e of trail) {
    if (
      e.actor === "interviewer" ||
      e.actor === "cartographer" ||
      e.actor === "notary"
    ) {
      assert.equal(
        e.policyVersion,
        owl.policyVersion,
        `${e.actor} seq ${e.seq} should bind to input.policyVersion`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Override semantics — scenario_override row, placement, redaction
// ---------------------------------------------------------------------------

test("audit: no override → no scenario_override row; role_projection is last", async () => {
  const trail = await trailFor(owl, "utility" /* no override */);
  const overrides = trail.filter((e) => e.reasonCode === "scenario_override");
  assert.equal(overrides.length, 0);
  assert.equal(trail[trail.length - 1].reasonCode, "role_projection");
});

test("audit: override → exactly one scenario_override row, placed before role_projection", async () => {
  const trail = await trailFor(owl, "utility", { flexPercent: 30 });
  const overrides = trail.filter((e) => e.reasonCode === "scenario_override");
  assert.equal(overrides.length, 1);
  const last = trail[trail.length - 1];
  assert.equal(last.reasonCode, "role_projection");
  // Override row sits immediately before role_projection.
  assert.equal(trail[trail.length - 2].reasonCode, "scenario_override");
});

test("audit: override for non-applicant redacts the baseline value", async () => {
  const override = { flexPercent: 30 };
  const trail = await trailFor(owl, "utility", override);
  const row = trail.find((e) => e.reasonCode === "scenario_override")!;
  assert.ok(row.action.includes("(baseline sealed)"), `action: ${row.action}`);
  // And the raw baseline flex (22 for Owl) never appears in the action string.
  assert.ok(
    !row.action.includes(`${owl.privateProfile.flexPercent}%`),
    `leaked baseline: ${row.action}`,
  );
});

test("audit: override for applicant exposes the baseline value (they authored it)", async () => {
  const override = { flexPercent: 30 };
  const trail = await trailFor(owl, "applicant", override);
  const row = trail.find((e) => e.reasonCode === "scenario_override")!;
  assert.ok(
    row.action.includes(`(baseline ${owl.privateProfile.flexPercent}%)`),
    `action: ${row.action}`,
  );
});

test("audit: override row seq is contiguous with the preceding events (no gap)", async () => {
  const trail = await trailFor(owl, "utility", { flexPercent: 30 });
  for (let i = 0; i < trail.length; i++) {
    assert.equal(trail[i].seq, i + 1, `seq gap at index ${i}`);
  }
});

// ---------------------------------------------------------------------------
// Shape + redaction-action coverage
// ---------------------------------------------------------------------------

test("audit: 5 canonical actors fire in order for a no-override trail", async () => {
  const trail = await trailFor(owl, "utility");
  const actors = trail.map((e) => e.actor);
  // Expected order from audit.ts: interviewer, cartographer, notary, forecaster, referee, referee (role_projection).
  assert.deepEqual(actors, [
    "interviewer",
    "cartographer",
    "notary",
    "forecaster",
    "referee",
    "referee",
  ]);
});

test("audit: every artifactHash is a 16-hex-char truncation (except forecaster which may use a full hex too)", async () => {
  const trail = await trailFor();
  for (const e of trail) {
    // All artifactHash values in this module are slice(0,16) of a sha256 hex.
    assert.match(
      e.artifactHash,
      /^[0-9a-f]{16}$/,
      `seq ${e.seq} artifactHash: ${e.artifactHash}`,
    );
  }
});

test("audit: notary sealed_raw_input row advertises 8 sealed fields", async () => {
  // Regression guard: if a new private field is added, this count must change.
  // It's the tripwire CLAUDE.md asks for when projection/policy shifts.
  const trail = await trailFor();
  const notary = trail.find((e) => e.reasonCode === "sealed_raw_input");
  assert.ok(notary, "missing sealed_raw_input row");
  assert.equal(notary!.details.sealedFieldCount, 8);
});

test("audit: role_projection details carry the requesting role", async () => {
  for (const role of ["applicant", "utility", "regulator"] as const) {
    const trail = await trailFor(owl, role);
    const last = trail[trail.length - 1];
    assert.equal(last.reasonCode, "role_projection");
    assert.equal(last.details.role, role);
  }
});

test("audit: event ids are deterministic and scoped to caseId", async () => {
  const a = await trailFor(owl, "utility");
  const b = await trailFor(owl, "utility");
  for (let i = 0; i < Math.min(5, a.length); i++) {
    // First 5 events have deterministic timestamps (anchor-derived), so their
    // ids, artifact hashes, and prevHashes all match across calls.
    assert.equal(a[i].id, b[i].id, `id drift at seq ${i + 1}`);
    assert.equal(a[i].artifactHash, b[i].artifactHash);
    assert.equal(a[i].prevHash, b[i].prevHash);
  }
  assert.ok(a[0].id.startsWith("audit_owl-compute_"));
});

test("audit: different case → different event-id namespace", async () => {
  const trail = await trailFor(lantern);
  assert.ok(trail[0].id.startsWith("audit_lantern-cloud_"));
});
