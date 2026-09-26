export const API = process.env.NEXT_PUBLIC_TESSERA_API_URL ?? "http://localhost:8000";

export type Workflow = "FAST" | "INVESTIGATE" | "ASSURANCE";

export type Task = {
  id: string;
  title: string;
  description: string;
  domain: string;
  task_type: string;
  risk_level: "low" | "medium" | "high";
  sensitive_area: string | null;
  status: string;
  created_at: string;
  constraints: {
    require_tests: boolean;
    require_behavior_preservation: boolean;
    require_human_approval: boolean;
    max_execution_seconds: number | null;
    budget_units: number | null;
  };
};

export type Decision = {
  id: string;
  task_id: string;
  workflow: Workflow;
  reason_codes: string[];
  rationale: string;
  candidate_scores: Record<string, number | null>;
  forced_experiment: boolean;
  decided_at: string;
};

export type Execution = {
  id: string;
  task_id: string;
  routing_decision_id: string;
  runtime: string;
  workflow: Workflow;
  base_commit: string | null;
  result_commit: string | null;
  started_at: string;
  completed_at: string | null;
  elapsed_ms: number | null;
  cost_usd: number | null;
  retry_count: number;
  status: string;
};

export type CheckResult = {
  name: string;
  passed: boolean;
  details: Record<string, unknown>;
};

export type Evaluation = {
  id: string;
  execution_id: string;
  verdict: "passed" | "failed" | "review_required";
  checks: CheckResult[];
  evidence_artifact_ids: string[];
  evaluated_at: string;
};

export type Outcome = {
  id: string;
  execution_id: string;
  task_id: string;
  workflow: Workflow;
  verified: boolean;
  failure_category: string | null;
  observed_elapsed_ms: number | null;
  recorded_at: string;
};

export type TaskHistory = {
  task: Task;
  decisions: Decision[];
  executions: Execution[];
  outcomes: Outcome[];
};

export type Summary = {
  tasks: number;
  executions: number;
  verified: number;
  failed: number;
  routes: Record<Workflow, number>;
};

export type SolverResult = {
  solver: string;
  feasible: boolean;
  assignment: Record<string, Workflow>;
  objective: number | null;
  elapsed_ms: number;
  optimality_proven: boolean;
  details: Record<string, unknown>;
};

export type OptimizationComparison = {
  problem_hash: string;
  exact: SolverResult;
  qaoa: SolverResult | null;
  quantum_available: boolean;
  selected_solver: string;
  selected_assignment: Record<string, Workflow>;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  summary: () => json<Summary>("/api/dashboard/summary"),
  tasks: () => json<Task[]>("/api/tasks"),
  createTask: (body: unknown) => json<Task>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
  route: (id: string) => json<Decision>(`/api/tasks/${id}/route`, { method: "POST" }),
  history: (id: string) => json<TaskHistory>(`/api/tasks/${id}/history`),
  createExecution: (body: unknown) => json<Execution>("/api/executions", { method: "POST", body: JSON.stringify(body) }),
  completeExecution: (id: string, body: unknown = {}) => json<Execution>(`/api/executions/${id}/complete`, { method: "POST", body: JSON.stringify(body) }),
  evaluateExecution: (id: string) => json<Evaluation>(`/api/executions/${id}/evaluate`, { method: "POST" }),
  recordOutcome: (id: string) => json<Outcome>(`/api/executions/${id}/record-outcome`, { method: "POST" }),
  optimize: (body: unknown) => json<OptimizationComparison>("/api/optimization/compare", { method: "POST", body: JSON.stringify(body) }),
};
