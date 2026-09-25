# Domain schemas

## Task

```json
{
  "id": "task_...",
  "title": "Normalize billing currency output",
  "description": "Make the billing output formatting consistent with a targeted change.",
  "domain": "software_engineering",
  "task_type": "formatting_fix",
  "risk_level": "low",
  "sensitive_area": "billing_formatting",
  "constraints": {
    "require_tests": true,
    "require_behavior_preservation": false,
    "require_human_approval": false,
    "max_execution_seconds": 300,
    "budget_units": 100
  }
}
```

## RouteDecision

Important fields: task ID, workflow, policy version, history cutoff, reason codes, rationale, candidate scores, decision timestamp.

The golden-path first task should be `FAST + LOW_RISK_TARGETED_CHANGE`. A later comparable task after a verified FAST failure should be `ASSURANCE + PRIOR_FAST_FAILURE`.

## Execution

One immutable attempt under one route decision. Runtime is initially `ibm_bob`; model identity/cost remain null unless actually observed.

## Evaluation

Independent deterministic checks attached to an execution. The billing example records ordinary unit tests plus frozen golden regression cases.

## Outcome

The immutable summary of an evaluated execution. `verified=false` remains false even when a later execution succeeds.

## OptimizationRequest

A batch of tasks, each with eligible workflow candidates containing normalized cost, latency, and failure-penalty units. Hard eligibility is already decided before the solver.

## SolverResult

Contains solver name, feasibility, assignment, objective, elapsed time, `optimality_proven`, and details. QAOA always returns `optimality_proven=false` in V1.
