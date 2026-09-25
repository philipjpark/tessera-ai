# IBM Bob integration

This directory contains the runtime bridge between IBM Bob IDE and Tessera. Bob is the engineering agent; Tessera is the policy/evidence control plane.

## Supported integration boundary

Bob connects to the TypeScript MCP server in `mcp-server/`. The root `.bob/mcp.json` starts that server and exposes Tessera tools. Project custom modes, rules, and skills live under the root `.bob/` directory because that is where Bob discovers project-level configuration.

### MCP tools

- `profile_task` — persist a task and its explicit constraints.
- `select_workflow` — run the production route policy and return reason codes.
- `begin_execution` — create an immutable execution attempt before code edits.
- `complete_execution` — mark the attempt complete and optionally bind a result commit.
- `evaluate_execution` — run independent Tessera checks.
- `record_outcome` — persist the evaluated result.
- `get_route_history` — retrieve comparable prior evidence using point-in-time rules.
- `optimize_batch` — call the classical/Qiskit allocation comparison endpoint.

## What Bob owns

- codebase/document understanding
- planning
- subagent investigation
- implementation
- tool execution
- correction after Tessera returns evidence

## What Bob does not own

- final verification verdict
- rewriting outcome history
- fabricated telemetry
- Tessera's hard policy constraints
- claims of quantum advantage

## Setup

1. Start the API on port 8000.
2. `npm install` at repo root.
3. `npm --workspace @tessera/ibm-bob-mcp run build`.
4. Open the repo root in Bob IDE.
5. Settings -> MCP -> Project: verify `tessera` is enabled.
6. Select the `Tessera Engineer` custom mode.
7. Start with `DEMO_PROMPTS.md`.

Keep read-only operations auto-approved if desired; require approval for writes/commands during the recorded demonstration so the human checkpoint is visible.
