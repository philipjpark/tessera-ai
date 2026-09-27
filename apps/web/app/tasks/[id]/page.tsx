"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Decision, Evaluation, Execution, Outcome, Task, TaskHistory } from "@/lib/api";

// ── Reason code descriptions ──────────────────────────────────────────────
const REASON_DESCRIPTIONS: Record<string, string> = {
  LOW_RISK_TARGETED_CHANGE: "Low-risk, targeted change — minimal workflow sufficient",
  MEDIUM_RISK: "Medium risk — standard verification required",
  HIGH_RISK: "High risk — FAST ineligible",
  SENSITIVE_AREA: "Sensitive area — FAST ineligible",
  BEHAVIOR_PRESERVATION_REQUIRED: "Mandatory behavior preservation — independent assurance required",
  HUMAN_APPROVAL_REQUIRED: "Human approval required — ASSURANCE only",
  PRIOR_FAST_FAILURE:
    "A comparable FAST execution previously failed Tessera's independent verification. FAST is now ineligible.",
  REPOSITORY_CONTEXT_REQUIRED: "Task type requires repository context before implementation",
  RUST_ROUTER_FALLBACK: "Python fallback router used — decision is identical",
};

// ── Reason codes that get a highlighted treatment ─────────────────────────
const HIGHLIGHT_CODES = new Set(["PRIOR_FAST_FAILURE", "BEHAVIOR_PRESERVATION_REQUIRED", "HUMAN_APPROVAL_REQUIRED", "HIGH_RISK"]);

// ── Small helpers ─────────────────────────────────────────────────────────
function WorkflowBadge({ wf }: { wf?: string }) {
  if (!wf) return <span className="badge neutral">—</span>;
  return <span className={`badge ${wf}`}>{wf}</span>;
}

function ts(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}

// ── ETL step shell ────────────────────────────────────────────────────────
function ETLStep({
  dotCls,
  heading,
  last,
  children,
}: {
  dotCls: string;
  heading: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="etl-step">
      <div className="etl-spine">
        <div className={`etl-dot ${dotCls}`} />
        {!last && <div className="etl-line" />}
      </div>
      <div className="etl-content">
        <div className="etl-heading">{heading}</div>
        {children}
      </div>
    </div>
  );
}

export default function TaskDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [h, setH] = useState<Partial<TaskHistory>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const load = () =>
    api.history(id).then(x => setH(x)).catch(e => setMsg(String(e)));

  useEffect(() => { load(); }, [id]);

  const task: Task | undefined = h.task;
  const latest: Decision | undefined = h.decisions?.at(-1);
  const exec: Execution | undefined = h.executions?.at(-1);
  const execId = exec?.id ?? null;
  const allOutcomes: Outcome[] = h.outcomes ?? [];
  const latestOutcome: Outcome | undefined = allOutcomes.at(-1);

  // Parse regression failures from evaluation
  type Failure = { name: string; expected: string; actual: string };
  const regressionCheck = evaluation?.checks?.find(c => c.name === "golden_regression");
  const failures: Failure[] =
    (regressionCheck?.details?.failures as Failure[] | undefined) ?? [];

  async function startExec() {
    if (!latest) return;
    setBusy(true);
    try {
      const e = await api.createExecution({ task_id: id, routing_decision_id: latest.id, runtime: "ibm_bob", base_commit: null });
      setMsg(`IBM Bob execution registered: ${e.id}`);
      await load();
    } catch (e) { setMsg(String(e)); }
    finally { setBusy(false); }
  }

  async function completeAndEvaluate() {
    if (!execId) return;
    setBusy(true);
    try {
      await api.completeExecution(execId, {});
      const ev = await api.evaluateExecution(execId);
      setEvaluation(ev);
      setMsg(`Independent evaluation: ${ev.verdict}`);
      await api.recordOutcome(execId);
      await load();
    } catch (e) { setMsg(String(e)); }
    finally { setBusy(false); }
  }

  // Determine dot state for each step
  const profileDot = task ? "done" : "pending";
  const routeDot = latest ? "done" : "pending";
  const execDot = exec ? "done" : "pending";
  const verifyDot = evaluation
    ? evaluation.verdict === "passed" ? "done" : "fail"
    : (allOutcomes.length > 0
      ? (latestOutcome?.verified ? "done" : "fail")
      : "pending");
  const outcomeDot = allOutcomes.length > 0
    ? (latestOutcome?.verified ? "done" : "fail")
    : "pending";

  // Derive top-level verify state from evaluation OR persisted outcomes
  const verifyState: "passed" | "failed" | "pending" =
    evaluation
      ? (evaluation.verdict === "passed" ? "passed" : "failed")
      : allOutcomes.length > 0
        ? (latestOutcome?.verified ? "passed" : "failed")
        : "pending";

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="eyebrow">Task evidence</div>
        <h1>{task?.title ?? "Loading…"}</h1>
        <p>{task?.description}</p>
      </section>

      {msg && <div className="notice info">{msg}</div>}

      {/* ── Demo status bar ── */}
      <div className="demo-status-bar">
        {/* Selected workflow */}
        <div className={`demo-status-cell${latest ? ` wf-${latest.workflow}` : ""}`}>
          <div className="dsc-label">Selected workflow</div>
          <div className="dsc-value">{latest?.workflow ?? "—"}</div>
          {latest && (
            <div className="dsc-sub">
              {latest.forced_experiment ? "Controlled experiment" : "Production policy"}
              {" · "}decision <span className="mono">{latest.id.slice(-8)}</span>
            </div>
          )}
        </div>

        {/* Reason codes */}
        <div className="demo-status-cell" style={{ flex: "2 1 300px" }}>
          <div className="dsc-label">Why this workflow</div>
          {latest ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {latest.reason_codes.map(code => (
                <span
                  key={code}
                  style={{
                    display: "inline-flex", alignItems: "center",
                    fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 700,
                    padding: "4px 10px", borderRadius: 6,
                    background: HIGHLIGHT_CODES.has(code) ? "var(--warn-dim)" : "var(--panel2)",
                    border: `1px solid ${HIGHLIGHT_CODES.has(code) ? "var(--warn)" : "var(--line)"}`,
                    color: HIGHLIGHT_CODES.has(code) ? "var(--warn)" : "var(--text)",
                  }}
                >
                  {HIGHLIGHT_CODES.has(code) ? "⚠ " : ""}{code}
                </span>
              ))}
              {latest.reason_codes.length === 0 && <span className="muted" style={{ fontSize: 13 }}>—</span>}
            </div>
          ) : (
            <div className="dsc-value" style={{ fontSize: 20 }}>—</div>
          )}
        </div>

        {/* Verification status */}
        <div className={`demo-status-cell verify-${verifyState}`}>
          <div className="dsc-label">Verification</div>
          <div className="dsc-value">
            {verifyState === "passed" ? "✓ PASSED" : verifyState === "failed" ? "✗ FAILED" : "Pending"}
          </div>
          <div className="dsc-sub">
            {verifyState === "pending" ? "Not yet evaluated" : "Tessera independent evaluator"}
          </div>
        </div>
      </div>

      {/* ── Profile metadata ── */}
      {task && (
        <div className="card" style={{ marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span className={`badge ${task.risk_level}`}>{task.risk_level} risk</span>
          <span className="badge neutral">{task.task_type}</span>
          {task.sensitive_area && <span className="badge neutral">{task.sensitive_area}</span>}
          <span className="task-card-id">{task.id}</span>
          <span className="muted" style={{ fontSize: 12 }}>Created {ts(task.created_at)}</span>
        </div>
      )}

      {/* ── Evidence timeline ── */}
      <div className="evidence-timeline">

        {/* 1. PROFILE */}
        <ETLStep dotCls={profileDot} heading="01 · Profile">
          <div className="etl-card">
            {task ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className={`badge ${task.risk_level}`}>{task.risk_level} risk</span>
                  <span className="badge neutral">{task.task_type}</span>
                  {task.sensitive_area && <span className="badge neutral">{task.sensitive_area}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Behavior preservation: {task.constraints.require_behavior_preservation ? "required" : "not required"} ·
                  Human approval: {task.constraints.require_human_approval ? "required" : "not required"}
                </div>
              </div>
            ) : (
              <span className="muted">Loading…</span>
            )}
          </div>
        </ETLStep>

        {/* 2. ROUTE */}
        <ETLStep dotCls={routeDot} heading="02 · Route">
          {latest ? (
            <div className="etl-card">
              {/* Prominent workflow heading */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
                <div
                  className={`wf-metric ${latest.workflow}`}
                  style={{
                    fontSize: 36, padding: "4px 16px",
                    background: latest.workflow === "FAST" ? "var(--fast-bg)"
                      : latest.workflow === "ASSURANCE" ? "var(--assurance-bg)"
                      : "var(--investigate-bg)",
                    borderRadius: 10,
                    border: `2px solid ${latest.workflow === "FAST" ? "var(--fast-color)"
                      : latest.workflow === "ASSURANCE" ? "var(--assurance-color)"
                      : "var(--investigate-color)"}`,
                  }}
                >
                  {latest.workflow}
                </div>
                {latest.forced_experiment && <span className="badge warn">Controlled experiment</span>}
              </div>
              <p style={{ fontSize: 13, marginTop: 0 }}>{latest.rationale}</p>
              {/* Reason codes with highlight for impactful ones */}
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {latest.reason_codes.map(code => (
                  <div
                    key={code}
                    className={`reason-card${HIGHLIGHT_CODES.has(code) ? " highlight" : ""}`}
                    style={{ display: "inline-flex", flexDirection: "column", gap: 3, maxWidth: 340 }}
                  >
                    <span className="reason-name">{HIGHLIGHT_CODES.has(code) ? "⚠ " : ""}{code}</span>
                    <span className="reason-desc">{REASON_DESCRIPTIONS[code] ?? ""}</span>
                  </div>
                ))}
              </div>
              {/* Candidate scores */}
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(latest.candidate_scores).map(([k, v]) => (
                  <div key={k} style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", minWidth: 90 }}>
                    <WorkflowBadge wf={k} />
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{v === null ? <span style={{ color: "var(--bad)" }}>Ineligible</span> : v.toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{v === null ? "by policy" : "score"}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <button onClick={startExec} disabled={busy || !latest}>
                  Register IBM Bob execution
                </button>
              </div>
            </div>
          ) : (
            <div className="etl-card muted">No routing decision yet.</div>
          )}
        </ETLStep>

        {/* 3. BOB EXECUTION */}
        <ETLStep dotCls={execDot} heading="03 · IBM Bob execution">
          {exec ? (
            <div className="etl-card">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <WorkflowBadge wf={exec.workflow} />
                <span className="badge neutral">{exec.status}</span>
                {exec.elapsed_ms != null && (
                  <span className="muted" style={{ fontSize: 12 }}>{Math.round(exec.elapsed_ms)} ms</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                Execution ID: <span className="mono">{exec.id}</span><br />
                Started: {ts(exec.started_at)}
                {exec.completed_at && <> · Completed: {ts(exec.completed_at)}</>}
              </div>
              <div style={{ marginTop: 12 }}>
                <button onClick={completeAndEvaluate} disabled={busy || !execId}>
                  Complete + independently evaluate
                </button>
              </div>
            </div>
          ) : (
            <div className="etl-card muted">
              No execution registered yet.{" "}
              {latest ? "Use the button in step 02 to register." : "Route the task first."}
            </div>
          )}
        </ETLStep>

        {/* 4. INDEPENDENT VERIFICATION */}
        <ETLStep dotCls={verifyDot} heading="04 · Independent verification">
          {evaluation ? (
            <div className="etl-card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Full-width verdict banner */}
              <div className={`verify-banner ${evaluation.verdict === "passed" ? "passed" : "failed"}`}>
                <span className="vb-verdict">
                  {evaluation.verdict === "passed" ? "✓ PASSED" : "✗ FAILED"}
                </span>
                <div className="vb-meta">
                  <span className="vb-tag">Tessera independent evaluator · Agent cannot self-certify</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    Execution <span className="mono">{evaluation.execution_id.slice(-8)}</span>
                    {" · "}{ts(evaluation.evaluated_at)}
                  </span>
                </div>
              </div>
              {failures.length > 0 && (
                <div style={{ padding: "14px 20px", display: "grid", gap: 8 }}>
                  {failures.map(f => (
                    <div className="failure-card" key={f.name}>
                      <div>
                        <div className="fc-label">Test case</div>
                        <strong>{f.name}</strong>
                      </div>
                      <div>
                        <div className="fc-label">Expected</div>
                        <strong>{f.expected}</strong>
                      </div>
                      <div>
                        <div className="fc-label">Actual</div>
                        <strong style={{ color: "var(--bad)" }}>{f.actual}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {failures.length === 0 && evaluation.verdict === "passed" && (
                <p style={{ padding: "10px 20px 14px", fontSize: 13 }}>All frozen regression cases passed.</p>
              )}
            </div>
          ) : allOutcomes.length > 0 && latestOutcome ? (
            <div className={`verify-banner ${latestOutcome.verified ? "passed" : "failed"}`} style={{ borderRadius: "var(--radius)" }}>
              <span className="vb-verdict">
                {latestOutcome.verified ? "✓ PASSED" : "✗ FAILED"}
              </span>
              <div className="vb-meta">
                <span className="vb-tag">Previously recorded outcome</span>
                <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Re-run the workflow to get fresh evaluation details.
                </span>
              </div>
            </div>
          ) : (
            <div className="etl-card muted">
              No evaluation yet. Complete an execution to run Tessera&apos;s independent verification.
            </div>
          )}
        </ETLStep>

        {/* 5. OUTCOME(S) */}
        <ETLStep dotCls={outcomeDot} heading="05 · Outcomes" last>
          {allOutcomes.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {allOutcomes.map((o, idx) => (
                <div key={o.id} className={`etl-card ${o.verified ? "pass" : "fail"}`}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Outcome {idx + 1}</span>
                    <WorkflowBadge wf={o.workflow} />
                    {o.verified
                      ? <span className="badge verified">✓ Verified</span>
                      : <span className="badge failed">✗ Failed evidence</span>}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                    {o.verified
                      ? "Independent verification passed."
                      : `Failure category: ${o.failure_category ?? "regression"} — this record is immutable and will influence future routing.`}
                  </p>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    Recorded: {ts(o.recorded_at)} · ID: <span className="mono">{o.id}</span>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>
                Failed outcomes are never deleted or overwritten — they inform the next routing decision.
              </div>
            </div>
          ) : (
            <div className="etl-card muted">
              No outcomes recorded yet. Outcomes are written after independent verification.
            </div>
          )}
        </ETLStep>
      </div>

      {/* ── Back ── */}
      <div style={{ marginTop: 32 }}>
        <Link href="/tasks" className="text-link">← All tasks</Link>
      </div>
    </>
  );
}
