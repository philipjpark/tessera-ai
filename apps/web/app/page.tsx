"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Summary, Task, Decision, Outcome } from "@/lib/api";

// ── Causal proof steps — static copy describing the golden-path demo ───────
const CAUSAL_STEPS = [
  {
    icon: "→",
    cls: "route",
    title: "Task profiled — FAST selected",
    detail: "First billing-formatting task: low risk, targeted change. No prior failure evidence. Policy selects FAST.",
  },
  {
    icon: "✓",
    cls: "",
    title: "IBM Bob execution registered",
    detail: "Bob executes the change under the FAST workflow. Ordinary test suite passes.",
  },
  {
    icon: "✗",
    cls: "fail",
    title: "Independent Tessera verification FAILS",
    detail: 'Tessera\'s frozen regression fixture detects a half-cent boundary error. Expected 1.01 — Actual 1.00. Bob cannot self-certify; Tessera is the authority.',
  },
  {
    icon: "●",
    cls: "memory",
    title: "Failed outcome preserved as immutable evidence",
    detail: "FAST failure on this task profile is persisted. The record is never deleted or overwritten.",
  },
  {
    icon: "→",
    cls: "route",
    title: "Comparable task re-profiled — ASSURANCE selected",
    detail: "Second task has the same profile. Tessera detects PRIOR_FAST_FAILURE evidence. FAST becomes ineligible. Policy selects ASSURANCE.",
  },
  {
    icon: "✓",
    cls: "pass",
    title: "Independent Tessera verification PASSES",
    detail: "ASSURANCE workflow includes independent verification. All regression cases pass. Outcome recorded as verified.",
  },
];

// ── Derive latest decision per task from history ───────────────────────────
type EnrichedTask = Task & {
  latestDecision?: Decision | null;
  latestOutcome?: Outcome | null;
  runIndex: number;
};

function WorkflowBadge({ wf }: { wf?: string }) {
  if (!wf) return <span className="badge neutral">—</span>;
  return <span className={`badge ${wf}`}>{wf}</span>;
}

function OutcomeBadge({ outcome }: { outcome?: Outcome | null }) {
  if (!outcome) return <span className="badge neutral">No outcome</span>;
  return outcome.verified
    ? <span className="badge verified">✓ Verified</span>
    : <span className="badge failed">✗ Failed evidence</span>;
}

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [enriched, setEnriched] = useState<EnrichedTask[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.summary(), api.tasks()])
      .then(async ([s, t]) => {
        setSummary(s);
        setTasks(t);
        // Fetch decision + outcome for the 8 most recent tasks
        const recent = t.slice(0, 8);
        const histories = await Promise.allSettled(recent.map(task => api.history(task.id)));

        // Group tasks by title to derive run index
        const titleCounts: Record<string, number> = {};
        // Process oldest first to assign run numbers, then reverse for display
        const sorted = [...recent].reverse();
        const enrichedMap: Record<string, EnrichedTask> = {};
        sorted.forEach(task => {
          const key = task.title.toLowerCase().trim();
          titleCounts[key] = (titleCounts[key] ?? 0) + 1;
          enrichedMap[task.id] = { ...task, runIndex: titleCounts[key], latestDecision: null, latestOutcome: null };
        });

        // Fill in decision + outcome from history results
        recent.forEach((task, idx) => {
          const settled = histories[idx];
          if (settled.status === "fulfilled") {
            const h = settled.value;
            enrichedMap[task.id] = {
              ...enrichedMap[task.id],
              latestDecision: h.decisions?.at(-1) ?? null,
              latestOutcome: h.outcomes?.at(-1) ?? null,
            };
          }
        });

        setEnriched(recent.map(t => enrichedMap[t.id]));
      })
      .catch(e => setError(String(e)));
  }, []);

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="eyebrow">Outcome-aware intelligence control plane</div>
        <h1>Route engineering work.<br />Verify the outcome. Learn from evidence.</h1>
        <p>
          Tessera profiles software tasks, selects an execution workflow for IBM Bob,
          independently verifies the result, and preserves every outcome so the next routing
          decision is better informed.
        </p>
      </section>

      {error && <div className="notice error">API unavailable — {error}</div>}

      {/* ── Metrics ── */}
      <div className="metric-grid">
        {([
          ["Tasks", summary?.tasks],
          ["Executions", summary?.executions],
          ["Verified", summary?.verified],
          ["Failed evidence", summary?.failed],
        ] as const).map(([l, v]) => (
          <div className="metric-card" key={l}>
            <div className="label">{l}</div>
            <div className="metric-val">{v ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* ── Core loop ── */}
      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">Core primitive</div>
            <h2>Task → Route → Bob → Verify → Remember → Better route</h2>
          </div>
          <Link href="/tasks"><button>Create task</button></Link>
        </div>
        <div className="flow">
          {["PROFILE", "ROUTE", "BOB EXECUTE", "VERIFY", "OUTCOME", "REUSE"].map((x, i) => (
            <><div className="flow-step" key={x}><span style={{ color: "var(--accent)", fontSize: 11 }}>0{i + 1}</span> {x}</div>{i < 5 && <span className="flow-arrow">›</span>}</>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 680, marginTop: 10 }}>
          Tessera owns routing policy and independent verification. IBM Bob is the engineering runtime.
          The agent cannot self-certify — Tessera&apos;s evaluator is the authority.
        </p>
      </section>

      {/* ── Causal proof ── */}
      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">Golden-path · Persisted records</div>
            <h2>Causal proof: how prior failure changes the next route</h2>
          </div>
          <span className="badge warn">PRIOR_FAST_FAILURE</span>
        </div>
        <div className="card">
          <div className="causal-timeline">
            {CAUSAL_STEPS.map((step, i) => (
              <div className="causal-step" key={i}>
                <div className={`causal-icon ${step.cls}`}>{step.icon}</div>
                <div>
                  <div className="causal-title">{step.title}</div>
                  <div className="causal-detail">{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="divider" />
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            The routing policy did not change between task 1 and task 2. Only the persisted outcome
            evidence changed. Tessera&apos;s deterministic evaluator surfaces PRIOR_FAST_FAILURE, which
            makes FAST ineligible and selects ASSURANCE automatically.
          </p>
        </div>
      </section>

      {/* ── Recent tasks timeline ── */}
      <section className="section">
        <div className="section-head">
          <h2>Recent tasks</h2>
          <span className="muted" style={{ fontSize: 12 }}>{tasks.length} persisted records</span>
        </div>

        {enriched.length === 0 && !error && (
          <div className="card muted" style={{ fontSize: 13 }}>No tasks yet. Use the Tasks page to create the billing demo task.</div>
        )}

        <div className="task-timeline">
          {enriched.map(task => {
            const wf = task.latestDecision?.workflow;
            // Determine if this task title appears more than once across all tasks
            const titleCount = tasks.filter(t => t.title.toLowerCase().trim() === task.title.toLowerCase().trim()).length;
            const runLabel = titleCount > 1 ? `Run ${task.runIndex}` : null;

            return (
              <div className="task-card" key={task.id}>
                <div className={`task-card-accent ${wf ?? "unknown"}`} />
                <div className="task-card-body">
                  <div className="task-card-top">
                    <Link href={`/tasks/${task.id}`} className="task-card-title">
                      {task.title}
                      {runLabel && <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>{runLabel}</span>}
                    </Link>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <WorkflowBadge wf={wf} />
                      <OutcomeBadge outcome={task.latestOutcome} />
                    </div>
                  </div>
                  <div className="task-card-meta">
                    <span className={`badge ${task.risk_level}`}>{task.risk_level} risk</span>
                    <span className="badge neutral">{task.task_type}</span>
                    {task.sensitive_area && <span className="badge neutral">{task.sensitive_area}</span>}
                    {task.latestDecision?.reason_codes.includes("PRIOR_FAST_FAILURE") && (
                      <span className="badge warn">PRIOR_FAST_FAILURE</span>
                    )}
                    <span className="task-card-id">{task.id}</span>
                    <span className="muted" style={{ fontSize: 11 }}>{new Date(task.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
