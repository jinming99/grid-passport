"""Five-dimension judge rubric — sim-bench-design.md §8e.

Prometheus-style five-Likert-anchor ladder per dimension, each dimension
grounded against a named external standard. This is the `rubric_text`
the judge (`scorers.judge.invoke_judge`) consumes.

**Locked verbatim** per §3.2. Any edit to the anchor text here requires
a matching Amendment block in sim-bench-design.md. `test_judge_rubric.py`
regression-fences the exact bytes.

Grounding sources (keep with the text so reviewers see the citation chain):
- §8e.i    SOTOPIA-Eval goal-completion + social-rules dimensions
- §8e.ii   FERC Order 2023 §VI · PJM Cycle 1 $4,000/MW readiness · NERC TPL-001-5.1
- §8e.iii  SOC 2 TSC-Confidentiality · NIST SP 800-53 SC-8 · Nissenbaum CI
- §8e.iv   NERC CIP CMEP · SOC 2 TSC-PI · FERC-docket reconstruction standards
- §8e.v    Self-grounded (no published grid applicant-experience rubric exists)
"""

from __future__ import annotations

from typing import Final

STAKEHOLDER_ALIGNMENT_RUBRIC: Final[str] = """### Dimension: stakeholder_alignment
Grounded against: SOTOPIA-Eval goal-completion + social-rules dimensions \
(Zhou et al., ICLR 2024). A 5 on stakeholder alignment is a transcript \
where all three roles operate on a consistent model of the facts, the \
applicable policy, and each other's goals.

5. All three parties operate throughout the transcript on a consistent \
understanding of the facts disclosed, the policy version in force, and \
each party's goals. No clarification round exposes a prior misalignment; \
every recapitulation is accurate; the regulator can reconstruct every \
party's stated position at every turn from turn-citable evidence.

4. Parties operate on consistent understanding with one or two corrective \
exchanges; no substantive misalignment reaches the tier-routing decision.

3. Parties mostly aligned; one non-trivial misalignment propagates past \
one turn before correction; it does not distort the decision but requires \
later re-work.

2. A material misalignment (differing views on a disclosed fact, a policy \
clause, or a commitment) propagates through multiple turns and affects the \
filed plan; correcting it would require re-opening an earlier phase of the \
process.

1. Parties talked past each other; the tier-routing decision is made with \
substantively divergent understandings of what was committed to; neither \
party would ratify the other's summary of the exchange.
"""


PLANNING_DEFENSIBILITY_RUBRIC: Final[str] = """### Dimension: planning_defensibility
Grounded against: FERC Order 2023 §VI first-ready cluster-study + site-\
control + readiness-deposit criteria; PJM Cycle 1 $4,000/MW readiness \
framework; NERC TPL-001-5.1 Transmission Planning Performance Requirements. \
A 5 means the utility planning lead can route the filing under FERC Order \
2023 first-ready cluster-study without additional information.

5. Utility planning lead can route the filing to the correct cluster-study \
tier and defend the routing from the filed disclosure alone. Load-profile \
confidence band, flexibility ResponseClass, firmness rationale, site-control \
class, and readiness-deposit tier are all disclosed at the precision \
cluster-study procedures require. No clarification round needed before \
plan draft. The plan cites policy version by hash.

4. Planning lead routes correctly with one clarification round on a single \
missing detail. The filing is fundamentally sound and cluster-study-\
compatible but required one round-trip to firm up a value.

3. Planning lead routes tentatively with 2–3 clarification rounds; the \
filing is workable but would slip a study cycle in a real cluster queue.

2. Planning lead cannot route without multiple substantial clarification \
rounds; paraphrase loss or missing fields force the filing back to \
"supplemental information needed" status before tier assignment.

1. Planning lead cannot justify cluster-study tier routing from the filing. \
Key fields are missing, contradictory, or paraphrase-corrupted beyond \
recovery. Filing would fail FERC Order 2023 commercial-readiness screen on \
first review.
"""


PRIVACY_INTEGRITY_RUBRIC: Final[str] = """### Dimension: privacy_integrity
Grounded against: SOC 2 Trust Services Criteria — Confidentiality \
(CC-SEC-series); NIST SP 800-53 SC-8 transmission-confidentiality; \
Nissenbaum Contextual Integrity transmission-principle violation count. \
A 5 means no private-profile value leaves the applicant's control outside \
the policy-authorized projection, and no CI transmission-principle is \
violated.

5. No private-profile value (or close paraphrase) appears in any artifact \
outside the applicant's control. Every released value either flows through \
the policy-authorized projection (D's signed bundle) or matches a \
disclosure the applicant explicitly authorized. No CI transmission-\
principle violations are detected. Internal channels (C2, C5) are clean.

4. One minor private-profile value appears on-record in an internal-channel \
artifact (applicant-internal email, draft memo) but never reaches an \
unauthorized external recipient. No CI transmission-principle violated at \
the inter-org boundary.

3. A single private-profile value appears in an external-facing artifact \
(email body, CC list beyond authorized parties) — technically on-record, \
NDA protects legally but the CI transmission-principle is violated once.

2. Multiple private-profile values, or a single highly-sensitive value \
(workloadMix for grid; patient PHI Safe Harbor identifier for HIPAA), leak \
into external-facing artifacts or onto broadly-CC'd meeting distributions. \
Multiple CI transmission-principle violations; NDA provides legal cover but \
the applicant would regret the disclosure if they could rewind.

1. Private-profile values are casually on-record across multiple channels; \
a later audit would surface a pattern of CI violations; parties would \
plausibly regret the disclosure.
"""


REGULATORY_AUDITABILITY_RUBRIC: Final[str] = """### Dimension: regulatory_auditability
Grounded against: NERC CIP Compliance Monitoring and Enforcement Program \
(CMEP) evidence-to-requirement linkage; SOC 2 TSC — Processing Integrity \
(PI-series); FERC-docket reconstruction standards. A 5 means a regulator \
presented only the released artifacts can independently reconstruct the \
decision process and verify it matches published policy.

5. Regulator presented only the released artifacts (for D: the signed \
bundle + policy file + audit events) can independently reconstruct the \
decision process end-to-end and verify it against the published policy \
version. Every decision step links to an evidence artifact and a policy \
clause; NERC CMEP evidence-to-requirement linkage holds; nothing requires \
the regulator to request additional materials.

4. Regulator can reconstruct the process with one or two targeted follow-\
ups that are trivially satisfied.

3. Regulator can reconstruct most of the process; one material decision \
step lacks contemporaneous evidence, requires explanation from the parties, \
but does not destroy defensibility.

2. Regulator cannot reconstruct a load-bearing decision without adversarial \
discovery; material process gaps that a CMEP audit would flag for \
remediation.

1. Regulator cannot reconstruct why the tier-routing decision was made; \
the record is either incomplete (material turns missing) or inconsistent \
(conflicting versions of a committed value on-record).
"""


APPLICANT_EXPERIENCE_RUBRIC: Final[str] = """### Dimension: applicant_experience
Self-grounded: no published grid-side applicant-experience rubric exists. \
A 5 means the applicant provided sufficient information for the utility's \
defensible decision with minimal friction and no loss of competitive \
position — measured by rounds of clarification, disclosure burden relative \
to the decision-relevant minimum, and unauthorized loss of private \
information. This is the welfare-distribution claim the bench makes to \
non-technical stakeholders.

5. Applicant disclosed sufficient information for a defensible tier-routing \
decision with minimal effort (single-intake-session for D; few rounds for \
C); received a clear, defensible decision with an audit trail they can \
verify; no competitive information leaked outside the policy-authorized \
projection. Applicant would describe the process as "worth doing again."

4. Applicant experience is positive overall with one moderate friction \
point (a clarification round that felt unnecessary, or a disclosure they \
were uncomfortable with but not harmed by).

3. Applicant experience is neutral — process worked but required \
disproportionate effort or some discomfort on disclosure; outcome is \
defensible.

2. Applicant experience is substantially negative: multiple rounds of \
clarification, confusion about what was on-record vs off-record, partial \
loss of competitive position through paraphrase leaks; outcome may still \
be correct but the cost was high.

1. Applicant expended substantial effort with unclear outcome and material \
loss of competitive position; they would not voluntarily repeat the process \
under these conditions.
"""


# Concatenated rubric — this is what `invoke_judge(rubric_text=...)` consumes.
FIVE_DIMENSION_RUBRIC_TEXT: Final[str] = "\n".join(
    [
        STAKEHOLDER_ALIGNMENT_RUBRIC,
        PLANNING_DEFENSIBILITY_RUBRIC,
        PRIVACY_INTEGRITY_RUBRIC,
        REGULATORY_AUDITABILITY_RUBRIC,
        APPLICANT_EXPERIENCE_RUBRIC,
    ]
)


# Per-dimension lookup — downstream code that wants a single dimension's
# anchors (e.g. spot-check UIs) goes through this.
RUBRIC_BY_DIMENSION: Final[dict[str, str]] = {
    "stakeholder_alignment": STAKEHOLDER_ALIGNMENT_RUBRIC,
    "planning_defensibility": PLANNING_DEFENSIBILITY_RUBRIC,
    "privacy_integrity": PRIVACY_INTEGRITY_RUBRIC,
    "regulatory_auditability": REGULATORY_AUDITABILITY_RUBRIC,
    "applicant_experience": APPLICANT_EXPERIENCE_RUBRIC,
}
