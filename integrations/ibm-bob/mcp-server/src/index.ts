import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API = process.env.TESSERA_API_URL ?? "http://localhost:8000";

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`Tessera ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const server = new McpServer({ name: "tessera", version: "0.2.0" });
const risk = z.enum(["low", "medium", "high"]);

server.tool(
  "profile_task",
  "Persist an engineering task and explicit constraints in Tessera. Do not invent unavailable telemetry.",
  {
    title: z.string().min(3),
    description: z.string().min(3),
    task_type: z.string().default("bug_fix"),
    risk_level: risk.default("medium"),
    sensitive_area: z.string().nullable().optional(),
    require_behavior_preservation: z.boolean().default(false),
    require_human_approval: z.boolean().default(false),
  },
  async (a) =>
    text(
      await request("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: a.title,
          description: a.description,
          task_type: a.task_type,
          risk_level: a.risk_level,
          sensitive_area: a.sensitive_area ?? null,
          constraints: {
            require_tests: true,
            require_behavior_preservation: a.require_behavior_preservation,
            require_human_approval: a.require_human_approval,
            max_execution_seconds: 300,
            budget_units: 100,
          },
        }),
      }),
    ),
);

server.tool(
  "select_workflow",
  "Select Tessera's production workflow for a persisted task and return explainable reason codes.",
  { task_id: z.string() },
  async ({ task_id }) => text(await request(`/api/tasks/${task_id}/route`, { method: "POST" })),
);

server.tool(
  "begin_execution",
  "Register an immutable IBM Bob execution attempt before substantive code edits.",
  {
    task_id: z.string(),
    routing_decision_id: z.string(),
    base_commit: z.string().nullable().optional(),
  },
  async (a) =>
    text(
      await request("/api/executions", {
        method: "POST",
        body: JSON.stringify({
          task_id: a.task_id,
          routing_decision_id: a.routing_decision_id,
          runtime: "ibm_bob",
          base_commit: a.base_commit ?? null,
        }),
      }),
    ),
);

server.tool(
  "complete_execution",
  "Mark an execution complete and bind the result commit when available.",
  { execution_id: z.string(), result_commit: z.string().nullable().optional() },
  async ({ execution_id, result_commit }) =>
    text(
      await request(`/api/executions/${execution_id}/complete`, {
        method: "POST",
        body: JSON.stringify({ result_commit: result_commit ?? null, cost_usd: null }),
      }),
    ),
);

server.tool(
  "evaluate_execution",
  "Run Tessera's deterministic independent evaluator. The agent must not self-certify success.",
  { execution_id: z.string() },
  async ({ execution_id }) =>
    text(await request(`/api/executions/${execution_id}/evaluate`, { method: "POST" })),
);

server.tool(
  "record_outcome",
  "Persist the latest independent evaluation as immutable outcome evidence.",
  { execution_id: z.string() },
  async ({ execution_id }) =>
    text(await request(`/api/executions/${execution_id}/record-outcome`, { method: "POST" })),
);

server.tool(
  "get_route_history",
  "Retrieve prior evidence relevant to a task without using future outcomes.",
  { task_id: z.string() },
  async ({ task_id }) => text(await request(`/api/tasks/${task_id}/route-history`)),
);

server.tool(
  "optimize_batch",
  "Compare exact classical allocation and optional Qiskit QAOA for a normalized batch problem.",
  { request_json: z.string().describe("JSON matching Tessera OptimizationRequest") },
  async ({ request_json }) =>
    text(
      await request("/api/optimization/compare", {
        method: "POST",
        body: JSON.stringify(JSON.parse(request_json) as unknown),
      }),
    ),
);

await server.connect(new StdioServerTransport());
