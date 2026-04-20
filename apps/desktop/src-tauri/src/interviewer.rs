//! Interviewer transport — routes a free-form applicant transcript
//! through the `claude` CLI (Claude Code) and returns the model's response
//! text (typically an Interviewer CaseInput hand-off JSON, or a clarify
//! question).
//!
//! Track 2.1b of sprint 2026-04-20. The subprocess inherits the parent
//! Claude Code session's OAuth auth via env — no API-key UX in the
//! webview. The webview calls `invoke("interviewer_query", ...)` and gets
//! back the raw model response as a String; parsing + validation +
//! clarify/CaseInput branching happen in
//! `apps/desktop/src/lib/interviewer-transport.ts`, so the write-scope
//! validator (from `@grid-passport/agents/interviewer/validator`) gates
//! every emission before it reaches React state.
//!
//! Error paths surface as `Err(String)` with a clear, user-facing
//! message. The webview wraps these as `transportError` in the tagged
//! result union.

use std::io::Write;
use std::process::{Command, Stdio};

/// `claude -p --output-format json` emits a structured envelope; we only
/// consume the three fields that determine success + text payload.
#[derive(serde::Deserialize)]
struct ClaudeJsonEnvelope {
    subtype: String,
    is_error: bool,
    result: Option<String>,
}

/// Model pinned at sonnet for cost + quality balance. Overridable via a
/// Track 2.1c follow-up when we wire model selection into the intake UI.
const DEFAULT_MODEL: &str = "sonnet";

/// Spawn `claude -p` with the Interviewer Skill source as system prompt
/// and the applicant transcript as the user prompt. Return the model's
/// raw text response (the `result` field of the JSON envelope).
///
/// The caller (TS transport) parses the returned string, branches on
/// clarify-shape vs CaseInput-shape, and runs `validateInterviewerOutput`
/// before writing to state.
#[tauri::command]
pub async fn interviewer_query(
    transcript: String,
    skill_source: String,
) -> Result<String, String> {
    // Tell the model how to shape its JSON. The skill_source (system
    // prompt) already encodes the write-scope contract, the non-coaching
    // rule, and the field catalog — we just enforce the output shape
    // here so the TS layer can branch deterministically.
    let user_prompt = format!(
        "Applicant intake (free-form prose):\n\n{transcript}\n\n\
         Emit exactly one JSON object. Choose ONE of:\n\n\
           (A) Interviewer hand-off — full CaseInput minus the Cartographer-\
               owned publicEvidence section. Required keys: id, caseId, \
               applicantOrg, requestedMW, targetCOD, phases, status (must be \
               \"draft\"), site {{state, county, parcelId, displayName}}, \
               privateProfile {{flexPercent, redundancyShiftPercent, \
               backupGenHours, backupGenMW, bessMW, bessHours, \
               internalScheduleConfidence, workloadMix {{training, \
               inference}}}}, policyVersion. Do NOT include publicEvidence \
               or derivedProof.\n\n\
           (B) Clarify — if more information is needed: \
               {{ \"clarify\": \"<what you still need to know>\" }}.\n\n\
         Respond with JSON only. No prose before or after. No markdown \
         fences.",
    );

    let mut child = Command::new("claude")
        .arg("-p")
        .arg("--no-session-persistence")
        .arg("--output-format")
        .arg("json")
        .arg("--system-prompt")
        .arg(&skill_source)
        .arg("--model")
        .arg(DEFAULT_MODEL)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            format!(
                "failed to spawn `claude`: {e}. Ensure the Claude Code CLI is \
                 installed and on PATH (https://claude.com/product/claude-code)."
            )
        })?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| "child stdin unavailable".to_string())?;
        stdin
            .write_all(user_prompt.as_bytes())
            .map_err(|e| format!("failed to write prompt to claude stdin: {e}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("waiting for claude exited abnormally: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "claude CLI exited with status {}; stderr: {}",
            output.status,
            stderr.trim()
        ));
    }

    let envelope: ClaudeJsonEnvelope = serde_json::from_slice(&output.stdout).map_err(|e| {
        let preview = String::from_utf8_lossy(&output.stdout);
        let preview: String = preview.chars().take(400).collect();
        format!("failed to parse claude stdout as JSON envelope: {e}; stdout preview: {preview}")
    })?;

    if envelope.is_error || envelope.subtype != "success" {
        return Err(envelope.result.unwrap_or_else(|| {
            "claude returned unsuccessful envelope with no result".to_string()
        }));
    }

    envelope
        .result
        .ok_or_else(|| "claude envelope missing `result` field".to_string())
}
