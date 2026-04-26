"""Generate Cartographer cache fixtures — sim-bench-design.md §6e.

One live Cartographer run per scenario. Output lands at
`eval_sim/fixtures/cartographer-cache/<scenario.public_evidence_cache_path>`
with the file's SHA-256 recorded in `cache-hashes.json` alongside.

§6e protocol: D + A read these fixtures verbatim; C runs Cartographer
live every turn. **Cache is refreshed once** before the main run.
Mid-experiment refresh requires an amendment per §3.2.

Dry-run (`--live` omitted) writes a stub JSON fixture per scenario so
the runner's `cache_hash` has a stable byte string to hash. `--live`
invokes the `.claude/skills/cartographer/` Skill through the default
`ClaudeAgentSDKTransport` (Opus 4.7, product-agent tier per §5e), parses
the `<ANSWER>…</ANSWER>` JSON block into a typed `PublicEvidence`, then
runs the paired CI validator (`packages/agents/cartographer/scripts/
validate_publicevidence.ts`) before committing the fixture. S7 (HIPAA
priorauth) writes a typed sentinel per Amendment A-3 — the grid-specific
Cartographer Skill doesn't apply to that domain.

Usage:
    PYTHONPATH=. uv run python scripts/generate_cartographer_cache.py \\
        [--scenario S1] [--live]
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import typer
from rich.console import Console

from eval_sim import scenarios
from eval_sim.config import MODEL_TIERS
from eval_sim.llm import Transport, get_default_transport
from eval_sim.schemas.caseinput import PublicEvidence, SourceRef
from eval_sim.schemas.scenario import ScenarioCard

app = typer.Typer(add_completion=False, help=__doc__)
console = Console()

# packages/eval-sim/scripts/<this>.py  →  parents[1] = packages/eval-sim
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
# packages/eval-sim  →  parents[2] = repo root
REPO_ROOT = Path(__file__).resolve().parents[3]

FIXTURE_ROOT = PACKAGE_ROOT / "eval_sim" / "fixtures" / "cartographer-cache"
CACHE_HASHES_PATH = FIXTURE_ROOT / "cache-hashes.json"
SKILL_ROOT = REPO_ROOT / ".claude" / "skills" / "cartographer"


# ────────────────────────────────────────────────────────────────────────
# Dry-run stub (pre-live default)
# ────────────────────────────────────────────────────────────────────────


def _stub_public_evidence(scenario_id: str, domain: str) -> PublicEvidence:
    """Domain-appropriate dry-run stub. Grid scenarios get the PublicEvidence
    shape with placeholder risk classes + a clearly-marked stub sourceRef.
    """
    return PublicEvidence(
        floodRisk="low",
        permitRisk="low",
        zoningRisk="low",
        siteControlEvidence=False,
        sourceRefs=[
            SourceRef(
                label=f"DRY-RUN STUB ({scenario_id}, {domain})",
                url=f"https://example.invalid/dry-run/{scenario_id.lower()}",
            )
        ],
        notes=[
            f"DRY-RUN STUB. Regenerate with `--live` after §17 sign-off. "
            f"scenario={scenario_id} domain={domain}.",
        ],
    )


# ────────────────────────────────────────────────────────────────────────
# Live invocation — Skill loaded as system, scenario identity as user
# ────────────────────────────────────────────────────────────────────────


def _skill_system_prompt() -> str:
    """SKILL.md + SOURCES.md concatenated as one system prompt. This matches
    what the shipping desktop app loads when invoking the Skill — same
    write-scope contract, same source whitelist.
    """
    skill_md = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
    sources_md = (SKILL_ROOT / "SOURCES.md").read_text(encoding="utf-8")
    return (
        f"{skill_md}\n\n"
        f"---\n\n"
        f"# Bundled reference: SOURCES.md\n\n"
        f"{sources_md}\n"
    )


_CANONICAL_URL_RE = re.compile(
    r"^\s*(?:-\s*)?\*\*URL:\*\*\s*(https?://\S+)",
    re.IGNORECASE | re.MULTILINE,
)


def _load_canonical_source_urls() -> list[str]:
    """Parse SOURCES.md for canonical URLs — lines starting with
    `- **URL:**` — and return them as a deduplicated list.

    Pattern-based entries (`**URL pattern:**`) are deliberately excluded:
    the TS validator's whitelist-parser (`/https?:\\/\\/[^\\s)<>"]+/g`)
    captures backtick-wrapped pattern URLs with a trailing backtick which
    then fails exact-match whitelist lookups. Canonical URLs are the
    ones the model should emit verbatim.
    """
    text = (SKILL_ROOT / "SOURCES.md").read_text(encoding="utf-8")
    seen: set[str] = set()
    urls: list[str] = []
    for match in _CANONICAL_URL_RE.finditer(text):
        url = match.group(1).rstrip(".,;:)\"'")
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


_CARTO_USER_TEMPLATE = """\
You are Cartographer, invoked to populate the publicEvidence section for \
a Grid Passport interconnection filing. This call is part of the sim-bench \
cache-generation step (sim-bench-design.md §6e): we need one structured \
publicEvidence output per scenario, committed as the ground-truth fixture \
for conditions A (Oracle) and D (Grid Passport). The same Skill will be \
invoked LIVE during condition C scoring runs — hallucination delta between \
this cached result and C's live output is the §8d H-spec measurement.

IMPORTANT SCENARIO NOTE — this is a SYNTHETIC scenario. The site identity \
below does not correspond to a real parcel. Produce publicEvidence in the \
shape your Skill specifies (SOURCES.md URLs, structured risk classes), \
classifying risks based on plausible local evidence for a site in that \
county (e.g., Loudoun's data-center corridor has known flood + zoning \
patterns; Prince William has different patterns; etc.), and citing \
SOURCES.md URLs that WOULD be the right query for the real lookup. Every \
note MUST include the suffix: (synthetic scenario; URL shape from \
SOURCES.md, record not live-fetched).

Scenario context:
  applicantOrg:   {applicant_org}
  site:           {state} / {county} county / parcel {parcel_id}
  displayName:    {display_name}
  requestedMW:    {requested_mw}
  targetCOD:      {target_cod}

CANONICAL URL WHITELIST — sourceRefs[].url MUST be one of these \
VERBATIM (copy-paste; do not paraphrase, shorten, or invent variants). \
The paired CI validator enforces this against the same parser that \
extracts URLs from SOURCES.md:

{canonical_urls}

EMIT your output as a single JSON object between <ANSWER> and </ANSWER> \
tags. No prose before or after the tags. The JSON must match exactly:

<ANSWER>
{{
  "floodRisk": "low" | "medium" | "high",
  "permitRisk": "low" | "medium" | "high",
  "zoningRisk": "low" | "medium" | "high",
  "siteControlEvidence": true | false,
  "sourceRefs": [
    {{"label": "<source name>", "url": "<one of the whitelist URLs above>"}},
    ...
  ],
  "notes": [
    "<one-line summary ending in (synthetic scenario; URL shape from SOURCES.md, record not live-fetched)>",
    ...
  ]
}}
</ANSWER>

Every risk classification must have at least one sourceRef. Output ONLY \
the wrapped JSON — no explanation, no markdown fence.
"""


_ANSWER_RE = re.compile(r"<ANSWER>([\s\S]+?)</ANSWER>", re.IGNORECASE)
_MAX_ATTEMPTS = 3


def _invoke_live_cartographer(
    scenario_id: str,
    *,
    transport: Transport | None = None,
) -> PublicEvidence:
    """Live Cartographer fetch per §6e.

    Loads `.claude/skills/cartographer/{SKILL.md,SOURCES.md}` as the
    system prompt, composes a user message with the scenario's identity
    block, and expects the model to emit `<ANSWER>…</ANSWER>` wrapping
    a JSON `PublicEvidence`. Two retries on parse/validation failure
    with an error-nudge appended to the user message.

    Uses the product-agent tier (Opus 4.7 per §5e + Amendment A-3 #2)
    — the same tier condition D would use when running the Skill live.
    """
    card = scenarios.get(scenario_id)
    if card.domain == "priorauth":
        raise ValueError(
            f"scenario {scenario_id} is priorauth; use _write_sentinel_s7() "
            "(grid-specific Cartographer Skill does not apply to HIPAA)"
        )

    t = transport if transport is not None else get_default_transport()
    model = str(MODEL_TIERS["product-agent"])
    system = _skill_system_prompt()
    canonical_urls = "\n".join(f"  - {u}" for u in _load_canonical_source_urls())
    base_user = _CARTO_USER_TEMPLATE.format(
        applicant_org=card.applicant_org,
        state=card.site.state,
        county=card.site.county,
        parcel_id=card.site.parcelId,
        display_name=card.site.displayName,
        requested_mw=card.requested_mw,
        target_cod=card.target_cod,
        canonical_urls=canonical_urls,
    )
    user = base_user

    tmp_path = FIXTURE_ROOT / f".tmp.{card.public_evidence_cache_path}"
    FIXTURE_ROOT.mkdir(parents=True, exist_ok=True)
    last_error: str | None = None
    try:
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            console.print(
                f"  [cyan]attempt {attempt}/{_MAX_ATTEMPTS}[/cyan] — "
                f"invoking Skill via {t.__class__.__name__} ({model})"
            )
            try:
                text = t.complete(model=model, user=user, system=system, max_tokens=2048)
            except Exception as err:
                last_error = f"transport error: {err}"
                console.print(f"  [yellow]transport failed: {err}[/yellow]")
                user = base_user + (
                    f"\n\n(Transport retry nudge — previous attempt errored: {err})"
                )
                continue

            match = _ANSWER_RE.search(text)
            if match is None:
                last_error = "no <ANSWER>…</ANSWER> block in response"
                console.print(
                    f"  [yellow]parse failure: missing <ANSWER> block "
                    f"(got {len(text)} chars)[/yellow]"
                )
                user = (
                    base_user
                    + "\n\n(Retry nudge) Your previous response was missing "
                    "the <ANSWER>…</ANSWER> wrapper. Emit ONLY the JSON "
                    "wrapped in those tags, with no prose."
                )
                continue

            answer_json = match.group(1).strip()
            try:
                evidence = PublicEvidence.model_validate_json(answer_json)
            except Exception as err:
                last_error = f"PublicEvidence schema error: {err}"
                console.print(f"  [yellow]schema failure: {err}[/yellow]")
                user = (
                    base_user
                    + f"\n\n(Retry nudge) Your previous JSON had a schema "
                    f"error: {err}. Fix it. Risk classes are "
                    "\"low\" | \"medium\" | \"high\"; siteControlEvidence is "
                    "boolean; sourceRefs is an array of {label, url?}."
                )
                continue

            # In-loop CI validation: write to tmp path, run the TS
            # validator; on failure, feed the exact rejection message
            # back as a retry nudge so URL-whitelist violations get
            # corrected, not just schema violations.
            tmp_path.write_text(
                json.dumps(evidence.model_dump(), indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            try:
                _validate_via_ts_ci(tmp_path)
            except RuntimeError as err:
                last_error = f"CI validator: {err}"
                console.print(
                    f"  [yellow]CI validator rejected attempt {attempt}[/yellow]"
                )
                user = (
                    base_user
                    + "\n\n(Retry nudge) The paired CI validator rejected "
                    "your previous output with the error below. The most "
                    "common cause is an unwhitelisted sourceRefs[].url. "
                    "Use ONLY URLs from the CANONICAL URL WHITELIST above, "
                    "copied verbatim.\n\n"
                    f"Validator error:\n{err}"
                )
                continue

            return evidence
    finally:
        tmp_path.unlink(missing_ok=True)

    raise RuntimeError(
        f"live Cartographer failed for {scenario_id} after {_MAX_ATTEMPTS} "
        f"attempts: {last_error}"
    )


# ────────────────────────────────────────────────────────────────────────
# CI-validator subprocess gate (write-scope + SOURCES.md whitelist)
# ────────────────────────────────────────────────────────────────────────


def _validate_via_ts_ci(path: Path) -> None:
    """Run the TS CI validator on a candidate fixture. Raises RuntimeError
    on non-zero exit so the generator fails before the fixture promotes.
    """
    cmd = [
        "pnpm",
        "--filter",
        "@grid-passport/agents",
        "exec",
        "tsx",
        "cartographer/scripts/validate_publicevidence.ts",
        str(path),
    ]
    result = subprocess.run(
        cmd,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Cartographer CI validator rejected {path.name}:\n"
            f"--- stdout ---\n{result.stdout}\n"
            f"--- stderr ---\n{result.stderr}"
        )


# ────────────────────────────────────────────────────────────────────────
# Fixture writers
# ────────────────────────────────────────────────────────────────────────


def _write_public_evidence_fixture(
    card: ScenarioCard, evidence: PublicEvidence
) -> tuple[Path, str]:
    """Write the JSON fixture + update the cache-hashes manifest. Returns
    (path, sha256). Uses the scenario card's declared
    `public_evidence_cache_path` so the runner's `_cache_hash_for` hits
    the same file we wrote.
    """
    FIXTURE_ROOT.mkdir(parents=True, exist_ok=True)
    path = FIXTURE_ROOT / card.public_evidence_cache_path
    payload = evidence.model_dump()
    text = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    path.write_text(text, encoding="utf-8")
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    _update_manifest(card.scenario_id, digest)
    return path, digest


def _write_s7_sentinel() -> tuple[Path, str]:
    """S7 (HIPAA priorauth) has no Cartographer equivalent. Write a typed
    sentinel so `_cache_hash_for` resolves to a stable hash; scorer-side
    guards in §8d skip Cartographer-specific axes for the priorauth
    domain. Sentinel shape is intentionally NOT a valid PublicEvidence —
    the TS CI validator is bypassed for S7.
    """
    card = scenarios.get("S7")
    FIXTURE_ROOT.mkdir(parents=True, exist_ok=True)
    path = FIXTURE_ROOT / card.public_evidence_cache_path
    payload = {
        "domain": "priorauth",
        "cache_applicable": False,
        "notes": [
            "S7 is HIPAA prior-auth; the gridpassport-cartographer Skill is "
            "grid-specific (FEMA flood + VA DEQ permits + county GIS + EPRI "
            "DCFlex) and does not apply. §8d H-spec Cartographer axis should "
            "skip S7 rows; other axes score normally. Per Amendment A-3.",
        ],
    }
    text = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    path.write_text(text, encoding="utf-8")
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    _update_manifest(card.scenario_id, digest)
    return path, digest


def _update_manifest(scenario_id: str, digest: str) -> None:
    """Merge `{scenario_id: digest}` into `cache-hashes.json` manifest."""
    hashes: dict[str, str] = {}
    if CACHE_HASHES_PATH.is_file():
        try:
            hashes = json.loads(CACHE_HASHES_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            hashes = {}
    hashes[scenario_id] = digest
    CACHE_HASHES_PATH.write_text(
        json.dumps(hashes, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


# ────────────────────────────────────────────────────────────────────────
# Per-scenario orchestration
# ────────────────────────────────────────────────────────────────────────


def _generate_one(
    scenario_id: str,
    *,
    live: bool,
    skip_validator: bool = False,
) -> tuple[Path, str]:
    card = scenarios.get(scenario_id)

    # S7 — always sentinel, regardless of --live.
    if card.domain == "priorauth":
        console.print(f"  [dim]{scenario_id} is priorauth — writing sentinel[/dim]")
        return _write_s7_sentinel()

    if live:
        evidence = _invoke_live_cartographer(scenario_id)
    else:
        evidence = _stub_public_evidence(scenario_id, card.domain)

    path, digest = _write_public_evidence_fixture(card, evidence)

    # Live fixtures were already CI-validated in-loop during the Skill
    # invocation. Re-run the validator on the committed file as
    # defense-in-depth — guards against a Pydantic-serialization drift
    # that `evidence.model_dump() → JSON` could introduce vs. what the
    # validator saw from the in-loop tmp write. `--skip-validator` is a
    # last-resort escape for local iteration.
    if live and not skip_validator:
        try:
            _validate_via_ts_ci(path)
            console.print("  [green]CI validator: passed (post-commit)[/green]")
        except RuntimeError:
            path.unlink(missing_ok=True)
            _clear_manifest_entry(scenario_id)
            raise

    return path, digest


def _clear_manifest_entry(scenario_id: str) -> None:
    if not CACHE_HASHES_PATH.is_file():
        return
    try:
        hashes = json.loads(CACHE_HASHES_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return
    hashes.pop(scenario_id, None)
    CACHE_HASHES_PATH.write_text(
        json.dumps(hashes, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


# ────────────────────────────────────────────────────────────────────────
# CLI
# ────────────────────────────────────────────────────────────────────────


@app.command()
def generate(
    scenario: str | None = typer.Option(
        None,
        "--scenario",
        help="Specific scenario ID (e.g. 'S1'). Omit to generate all 7.",
    ),
    live: bool = typer.Option(
        False,
        "--live",
        help=(
            "Invoke the Cartographer Skill through `ClaudeAgentSDKTransport` "
            "(Opus 4.7, product-agent tier). Default is a dry-run stub. "
            "`--live` invokes the Skill and runs the TS CI validator."
        ),
    ),
    skip_validator: bool = typer.Option(
        False,
        "--skip-validator",
        help=(
            "Escape hatch for local iteration — bypass the TS CI validator. "
            "Production runs must NOT use this. Dry-run mode already skips."
        ),
    ),
) -> None:
    """Generate or refresh a Cartographer cache fixture (§6e)."""
    targets = [scenario] if scenario else scenarios.all_ids()
    if scenario and scenario not in scenarios.all_ids():
        console.print(f"[red]unknown scenario '{scenario}'[/red]")
        raise typer.Exit(code=1)

    mode = "[red]LIVE[/red]" if live else "[yellow]dry-run stub[/yellow]"
    console.print(
        f"[bold]generate_cartographer_cache[/bold] · {mode} · "
        f"{len(targets)} scenario(s) → {FIXTURE_ROOT.relative_to(REPO_ROOT)}"
    )
    had_failure = False
    for sid in targets:
        console.print(f"\n[bold]── {sid} ──[/bold]")
        try:
            path, digest = _generate_one(sid, live=live, skip_validator=skip_validator)
        except Exception as err:
            had_failure = True
            console.print(f"  [red]FAILED:[/red] {err}")
            continue
        console.print(f"  wrote: {path.relative_to(REPO_ROOT)}")
        console.print(f"  sha256: {digest[:16]}…{digest[-8:]}")

    if had_failure:
        console.print(
            "\n[red]one or more scenarios failed — cache is incomplete[/red]"
        )
        sys.exit(1)


if __name__ == "__main__":
    app()
