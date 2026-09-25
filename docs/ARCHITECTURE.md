# Architecture

## Goal

Tessera.ai V1 improves a software-maintenance workflow around IBM Bob by making workflow selection, independent verification, and historical outcomes explicit.

```text
Developer task
   |
   v
Tessera Control Plane (FastAPI)
   |-- profile + policy
   |-- Rust router when available / Python parity fallback
   |-- SQLite evidence/outcome memory
   |
   +--> IBM Bob via project MCP
   |       |-- Plan / Agent
   |       |-- subagent investigation
   |       `-- code change
   |
   +--> Independent Evaluator
   |       |-- ordinary tests
   |       `-- frozen golden regression fixtures
   |
   `--> Optional batch optimizer
           |-- exact classical enumeration
           `-- isolated Qiskit QAOA adapter
```

## Runtime boundaries

### Web
`apps/web` is the judge/user-facing TypeScript interface. It should explain decisions and evidence without requiring raw JSON.

### Control plane
`services/api` owns domain state, route decisions, executions, evaluations, outcomes, exact optimization, and shared candidate validation.

### Rust router
`crates/router` implements the deterministic policy as a typed CLI. The Python fallback exists so the demo does not depend on Cargo being installed on the presentation machine.

### IBM Bob
`integrations/ibm-bob/mcp-server` is a thin protocol bridge. It contains no domain routing policy. Project Bob configuration lives in `.bob/` because Bob discovers project modes, MCP configuration, rules, and skills there.

### Qiskit
`integrations/qiskit` is deliberately process-isolated. The API passes a normalized allocation request over stdin and receives JSON over stdout. If Qiskit is not installed, the exact solver remains available and the API reports the quantum experiment as unavailable.

## Evidence model

A failed execution is permanent evidence. A correction creates a new execution. A later routing decision may only use outcomes recorded before its `history_cutoff_at`.

## Golden-path causality

The first billing-formatting task is low risk and legitimately routes FAST. After its independent regression failure is persisted, a comparable low-risk task escalates to ASSURANCE specifically because `PRIOR_FAST_FAILURE` is now available. This is the central V1 proof.
