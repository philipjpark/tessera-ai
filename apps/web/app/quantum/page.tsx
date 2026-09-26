"use client";
import { useState } from "react";
import { api, OptimizationComparison, SolverResult } from "@/lib/api";

// ── Default allocation problem (same as before) ────────────────────────────
const PAYLOAD = {
  tasks: [
    {
      task_id: "docs",
      candidates: [
        { workflow: "FAST", cost_units: 8, latency_units: 6, failure_penalty: 1, eligible: true },
        { workflow: "ASSURANCE", cost_units: 30, latency_units: 25, failure_penalty: 0.5, eligible: true },
      ],
    },
    {
      task_id: "billing",
      candidates: [
        { workflow: "INVESTIGATE", cost_units: 25, latency_units: 18, failure_penalty: 8, eligible: true },
        { workflow: "ASSURANCE", cost_units: 40, latency_units: 28, failure_penalty: 1, eligible: true },
      ],
    },
    {
      task_id: "concurrency",
      candidates: [
        { workflow: "INVESTIGATE", cost_units: 28, latency_units: 22, failure_penalty: 4, eligible: true },
        { workflow: "ASSURANCE", cost_units: 45, latency_units: 33, failure_penalty: 2, eligible: true },
      ],
    },
  ],
  max_budget_units: 100,
  weights: { cost: 0.4, latency: 0.2, failure: 0.4 },
  run_qaoa: true,
};

const TASKS = PAYLOAD.tasks;
const WEIGHTS = PAYLOAD.weights;
const BUDGET = PAYLOAD.max_budget_units;

function WorkflowBadge({ wf }: { wf?: string }) {
  if (!wf) return <span className="badge neutral">—</span>;
  return <span className={`badge ${wf}`}>{wf}</span>;
}

function SolverCard({
  result,
  variant,
  available,
}: {
  result: SolverResult | null;
  variant: "exact" | "qaoa";
  available: boolean;
}) {
  const isExact = variant === "exact";
  const cardCls = `solver-card ${variant} ${!available && !isExact ? "unavailable" : ""}`;

  if (!isExact && !available) {
    return (
      <div className={cardCls}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Qiskit QAOA</span>
          <span className="badge warn">Research extension</span>
        </div>
        <div className="notice" style={{ margin: 0 }}>
          Qiskit extras not installed. The API continues to operate normally — quantum unavailability
          does not affect IBM Bob routing or workflow selection.
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
          Install <code>qiskit</code> and <code>qiskit-algorithms</code> to enable QAOA experiments.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={cardCls}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>
          {isExact ? "Exact Classical" : "Qiskit QAOA"}
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Run the comparison to see results.</p>
      </div>
    );
  }

  return (
    <div className={cardCls}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{isExact ? "Exact Classical" : "Qiskit QAOA"}</span>
        {!isExact && <span className="badge warn">Research extension</span>}
        {result.feasible
          ? <span className="badge verified">Feasible</span>
          : <span className="badge failed">Infeasible</span>}
      </div>

      <div className="solver-row">
        <span className="sr-key">Objective</span>
        <span className="sr-val">{result.objective?.toFixed(4) ?? "—"}</span>
      </div>
      <div className="solver-row">
        <span className="sr-key">Elapsed</span>
        <span className="sr-val">{result.elapsed_ms.toFixed(2)} ms</span>
      </div>
      <div className="solver-row">
        <span className="sr-key">Optimality proven</span>
        <span className="sr-val">{result.optimality_proven ? "Yes" : <span style={{ color: "var(--muted)" }}>No</span>}</span>
      </div>
      {!isExact && (
        <div className="solver-row">
          <span className="sr-key">Hard constraints validated by Tessera</span>
          <span className="sr-val">Yes</span>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div className="label" style={{ marginBottom: 8 }}>Assignment</div>
        <div className="solver-assignment">
          {Object.entries(result.assignment).map(([taskId, wf]) => (
            <div key={taskId} style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>{taskId}</div>
              <WorkflowBadge wf={wf} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Quantum() {
  const [result, setResult] = useState<OptimizationComparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      setResult(await api.optimize(PAYLOAD));
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="eyebrow">Research extension · Heterogeneous compute experiment</div>
        <h1>Quantum Lab</h1>
        <p>
          Compare exact classical enumeration against an optional Qiskit QAOA experiment on
          the same batch allocation problem. The exact solver is the V1 reference.
          QAOA never bypasses Tessera&apos;s hard constraints.
        </p>
      </section>

      <div className="notice info" style={{ marginBottom: 0 }}>
        <strong>Why this matters:</strong> Tessera&apos;s long-term control plane can allocate not only
        among agent workflows, but among different computational backends while maintaining the same
        policy and verification boundary. This is a research experiment — it does not claim quantum advantage.
      </div>

      {/* ── Problem parameters ── */}
      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">Batch allocation problem</div>
            <h2>{TASKS.length} tasks · {TASKS.reduce((n, t) => n + t.candidates.length, 0)} route candidates</h2>
          </div>
          <button onClick={run} disabled={busy}>
            {busy ? "Running comparison…" : "Compare solvers"}
          </button>
        </div>

        <div className="two">
          {/* Problem definition */}
          <div className="card">
            <div className="label" style={{ marginBottom: 12 }}>Tasks & candidates</div>
            {TASKS.map(task => (
              <div key={task.task_id} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{task.task_id}</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {task.candidates.map(c => (
                    <div key={c.workflow} style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--panel2)", borderRadius: 8, padding: "6px 10px", flexWrap: "wrap" }}>
                      <WorkflowBadge wf={c.workflow} />
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        cost {c.cost_units} · latency {c.latency_units} · failure penalty {c.failure_penalty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Objective */}
          <div className="card">
            <div className="label" style={{ marginBottom: 12 }}>Objective & budget</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div className="solver-row">
                <span className="sr-key">Shared budget</span>
                <span className="sr-val">{BUDGET} units</span>
              </div>
              <div className="solver-row">
                <span className="sr-key">Cost weight</span>
                <span className="sr-val">{WEIGHTS.cost}</span>
              </div>
              <div className="solver-row">
                <span className="sr-key">Latency weight</span>
                <span className="sr-val">{WEIGHTS.latency}</span>
              </div>
              <div className="solver-row">
                <span className="sr-key">Failure penalty weight</span>
                <span className="sr-val">{WEIGHTS.failure}</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, lineHeight: 1.6 }}>
              The solver minimizes the weighted sum of cost, latency, and failure penalty across all
              assigned workflows, subject to the shared budget constraint. Every candidate assignment
              produced by either solver is independently re-validated by Tessera.
            </p>
          </div>
        </div>
      </section>

      {/* ── Error ── */}
      {err && <div className="notice error">{err}</div>}

      {/* ── Solver comparison ── */}
      <section className="section">
        <div className="section-head">
          <h2>Solver comparison</h2>
          {result && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="muted" style={{ fontSize: 12 }}>Selected:</span>
              <span className="badge neutral">{result.selected_solver}</span>
            </div>
          )}
        </div>

        <div className="solver-grid">
          <SolverCard
            result={result?.exact ?? null}
            variant="exact"
            available={true}
          />
          <SolverCard
            result={result?.qaoa ?? null}
            variant="qaoa"
            available={result?.quantum_available ?? true}
          />
        </div>

        {/* Selected assignment */}
        {result && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="label" style={{ marginBottom: 10 }}>Selected assignment ({result.selected_solver})</div>
            <div className="solver-assignment">
              {Object.entries(result.selected_assignment).map(([taskId, wf]) => (
                <div key={taskId} style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{taskId}</div>
                  <WorkflowBadge wf={wf} />
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
              Tessera validated all hard constraints on this assignment before accepting it.
            </p>
          </div>
        )}
      </section>

      {/* ── Architecture note ── */}
      <section className="section">
        <div className="card" style={{ borderColor: "var(--line-strong)" }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Architecture note</div>
          <p style={{ fontSize: 13 }}>
            Qiskit is an <strong>optional heterogeneous-compute research extension</strong>.
            Its unavailability does not affect normal API startup, IBM Bob workflow routing,
            or Tessera evaluation. The exact classical solver is always available and is the
            authoritative V1 reference. QAOA receives the same normalized allocation problem
            and the same hard budget constraint. No quantum advantage is claimed.
          </p>
        </div>
      </section>
    </>
  );
}
