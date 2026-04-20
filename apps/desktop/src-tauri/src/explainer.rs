//! Explainer transport — routes a `ProjectedView` + `Role` through the
//! `claude` CLI (Claude Code) and returns a role-conditioned narration
//! string. Track 2.2-polish of sprint 2026-04-20.
//!
//! Mirrors `interviewer.rs` exactly: subprocess inherits the parent
//! Claude Code session's OAuth auth via env, no API-key UX in the
//! webview, same JSON envelope. The only difference is the system prompt
//! (Explainer SKILL.md + ROLE_VOICES.md + examples) and the user prompt
//! shape (ProjectedView JSON + Role, not free-form intake text).
//!
//! The webview runs the returned narration through
//! `@grid-passport/agents/explainer/validator::validateNarration` before
//! committing it to state — the structural contract is enforced on the
//! TS side, matching the Interviewer pipeline.

use std::io::Write;
use std::process::{Command, Stdio};

#[derive(serde::Deserialize)]
struct ClaudeJsonEnvelope {
    subtype: String,
    is_error: bool,
    result: Option<String>,
}

const DEFAULT_MODEL: &str = "sonnet";

/// Spawn `claude -p` with the Explainer Skill source as system prompt
/// and a structured user prompt carrying the ProjectedView JSON + the
/// requested role. Return the model's raw text (should be 2–3 paragraphs
/// of role-conditioned prose). Caller validates + gates on leak check.
#[tauri::command]
pub async fn explainer_query(
    projected_view: String,
    role: String,
    skill_source: String,
) -> Result<String, String> {
    let user_prompt = format!(
        "ProjectedView (JSON):\n\n{projected_view}\n\n\
         Role: {role}\n\n\
         Compose a role-conditioned narration per the SKILL.md workflow and \
         ROLE_VOICES.md voice block for this role. Output exactly 2–3 \
         paragraphs of plain-English prose. No JSON. No markdown fences. No \
         recommendations. Reference only values visible in the ProjectedView; \
         name sealed fields explicitly per the non-embellishment rule.",
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
