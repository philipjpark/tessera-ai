"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, Decision, Task } from "@/lib/api";

// ── Deterministic reason code explanations ───────────────────────────────
const REASON_DESCRIPTIONS: Record<string, string> = {
  LOW_RISK_TARGETED_CHANGE:
    "The task is low-risk with no prior failure evidence. Tessera selects FAST — the minimal verified workflow.",
  MEDIUM_RISK:
    "Medium risk level. FAST score is penalized; ASSURANCE or INVESTIGATE may be preferred.",
  HIGH_RISK:
    "High risk. FAST is ineligible regardless of other factors.",
  SENSITIVE_AREA:
    "The sensitive area (financial logic, auth, security, etc.) makes FAST ineligible.",
  BEHAVIOR_PRESERVATION_REQUIRED:
    "The task requires mandatory behavior preservation. Only ASSURANCE provides the independent verification needed.",
  HUMAN_APPROVAL_REQUIRED:
    "Human approval is mandatory. ASSURANCE is the only eligible workflow.",
  PRIOR_FAST_FAILURE:
    "A comparable FAST execution previously failed Tessera's independent verification. FAST is now ineligible for tasks matching this profile. This is why ASSURANCE was selected instead of FAST.",
  REPOSITORY_CONTEXT_REQUIRED:
    "The task type (investigation, concurrency bug, architecture) requires repository context before implementation. INVESTIGATE scores better.",
  RUST_ROUTER_FALLBACK:
    "The Rust router binary was unavailable. The Python fallback policy was used — decision is identical.",
  CONTROLLED_EXPERIMENT_OVERRIDE:
    "This decision was produced by a controlled experiment override, not the production policy. Not part of the golden path.",
};

function WorkflowBadge({ wf }: { wf?: string }) {
  if (!wf) return <span className="badge neutral">—</span>;
  return <span className={`badge ${wf}`}>{wf}</span>;
}

function ReasonCodeList({ codes }: { codes: string[] }) {
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
      {codes.map(code => (
        <div className="reason-card" key={code}>
          <div className="reason-name">{code}</div>
          <div className="reason-desc">
            {REASON_DESCRIPTIONS[code] ?? "Reason code recorded by Tessera routing policy."}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreGrid({ scores }: { scores: Record<string, number | null> }) {
  const entries = Object.entries(scores);
  return (
    <div className="scoregrid" style={{ marginTop: 12 }}>
      {entries.map(([k, v]) => (
        <div className="scoregrid-cell" key={k}>
          <WorkflowBadge wf={k} />
          <b className={k}>{v === null ? "Ineligible" : v.toFixed(1)}</b>
          <span>{v === null ? "Historical evidence or hard constraint" : "Lower = preferred"}</span>
        </div>
      ))}
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.tasks().then(setTasks).catch(e => setError(String(e)));
  useEffect(() => { load(); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const t = await api.createTask({
        title: f.get("title"),
        description: f.get("description"),
        task_type: f.get("task_type"),
        risk_level: f.get("risk"),
        sensitive_area: f.get("area") || null,
        constraints: {
          require_tests: true,
          require_behavior_preservation: f.get("preserve") === "on",
          require_human_approval: f.get("approval") === "on",
          max_execution_seconds: 300,
          budget_units: 100,
        },
      });
      setDecision(await api.route(t.id));
      await load();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  // Group tasks by title to derive run index (oldest-first ordering)
  const titleCounts: Record<string, number> = {};
  const sortedForRuns = [...tasks].reverse();
  const runMap: Record<string, number> = {};
  sortedForRuns.forEach(t => {
    const key = t.title.toLowerCase().trim();
    titleCounts[key] = (titleCounts[key] ?? 0) + 1;
    runMap[t.id] = titleCounts[key];
  });

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="eyebrow">Engineering tasks</div>
        <h1>Create, route, and learn from verified outcomes.</h1>
        <p>
          The default form represents the first golden-path task — a low-risk billing-formatting change.
          With no comparable failure evidence, production policy selects FAST.
          After a FAST failure is recorded, the next comparable task gets ASSURANCE automatically.
        </p>
      </section>

      {error && <div className="notice error">{error}</div>}

      {/* ── Create + Decision ── */}
      <div className="two section">
        {/* Form */}
        <div className="card">
          <div className="label" style={{ marginBottom: 16 }}>New task</div>
          <form onSubmit={submit}>
            <label>
              Title
              <input name="title" defaultValue="Normalize billing currency output" required />
            </label>
            <label>
              Description
              <textarea name="description" defaultValue="Make the billing output formatting consistent with a targeted change." required />
            </label>
            <div className="row">
              <label>
                Task type
                <select name="task_type" defaultValue="formatting_fix">
                  <option value="formatting_fix">Formatting fix</option>
                  <option value="bug_fix">Bug fix</option>
                  <option value="investigation">Investigation</option>
                  <option value="refactor">Refactor</option>
                  <option value="documentation">Documentation</option>
                </select>
              </label>
              <label>
                Risk level
                <select name="risk" defaultValue="low">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <label>
              Sensitive area
              <select name="area" defaultValue="billing_formatting">
                <option value="billing_formatting">billing_formatting</option>
                <option value="">None</option>
                <option value="financial_logic">financial_logic</option>
                <option value="auth">auth</option>
                <option value="security">security</option>
                <option value="parser">parser</option>
              </select>
            </label>
            <div className="checks">
              <label>
                <input type="checkbox" name="preserve" />
                Mandatory behavior preservation
              </label>
              <label>
                <input type="checkbox" name="approval" />
                Mandatory human approval
              </label>
            </div>
            <button disabled={busy}>{busy ? "Routing…" : "Create + production route"}</button>
          </form>
        </div>

        {/* Decision panel */}
        <div className="card">
          <div className="label" style={{ marginBottom: 12 }}>Latest route decision</div>
          {decision ? (
            <>
              <div className={`wf-metric ${decision.workflow}`}>{decision.workflow}</div>
              <p style={{ marginTop: 8, fontSize: 13 }}>{decision.rationale}</p>

              <div className="divider" />

              <div className="label">Why Tessera chose this workflow</div>
              <ReasonCodeList codes={decision.reason_codes} />

              <div className="divider" />

              <div className="label">Candidate scores</div>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>
                Lower score = more preferred. <code>null</code> = ineligible by policy.
              </p>
              <ScoreGrid scores={decision.candidate_scores} />

              {decision.reason_codes.includes("PRIOR_FAST_FAILURE") && (
                <div className="notice" style={{ marginTop: 14, fontSize: 12 }}>
                  <strong>PRIOR_FAST_FAILURE active:</strong> A comparable FAST execution previously
                  failed independent verification. FAST is ineligible for this task profile.
                  This is the evidence-driven route change in action.
                </div>
              )}
            </>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>
              Create a task to see the production routing decision, reason codes, and candidate scores.
            </p>
          )}
        </div>
      </div>

      {/* ── Task history ── */}
      <section className="section">
        <div className="section-head">
          <h2>Task history</h2>
          <span className="muted" style={{ fontSize: 12 }}>{tasks.length} records</span>
        </div>

        <div className="task-timeline">
          {tasks.map(t => {
            const dupeTitle = tasks.filter(x => x.title.toLowerCase().trim() === t.title.toLowerCase().trim()).length > 1;
            const run = dupeTitle ? `Run ${runMap[t.id]}` : null;

            return (
              <div className="task-card" key={t.id}>
                <div className="task-card-accent unknown" />
                <div className="task-card-body">
                  <div className="task-card-top">
                    <Link href={`/tasks/${t.id}`} className="task-card-title">
                      {t.title}
                      {run && <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>{run}</span>}
                    </Link>
                    <span className="muted" style={{ fontSize: 11, flexShrink: 0 }}>
                      {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="task-card-meta">
                    <span className={`badge ${t.risk_level}`}>{t.risk_level} risk</span>
                    <span className="badge neutral">{t.task_type}</span>
                    {t.sensitive_area && <span className="badge neutral">{t.sensitive_area}</span>}
                    <span className="task-card-id">{t.id}</span>
                    <Link href={`/tasks/${t.id}`} className="text-link" style={{ fontSize: 11 }}>
                      View evidence →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          {!tasks.length && (
            <div className="card muted" style={{ fontSize: 13 }}>No tasks yet.</div>
          )}
        </div>
      </section>
    </>
  );
}
