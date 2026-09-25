# Hackathon demo script

## What to prove

Tessera is not merely a verifier. It uses verified outcomes to change how later comparable work is executed.

## 1. Start services

- FastAPI control plane
- Next.js UI
- compiled IBM Bob MCP server
- IBM Bob IDE opened at repository root in `Tessera Engineer` mode

## 2. First production route

Create:

> Normalize the billing service's currency output formatting while keeping the change targeted.

Use `formatting_fix`, low risk, `billing_formatting`, tests required, no hard preservation/approval flags.

Expected production route before relevant history:

`FAST / LOW_RISK_TARGETED_CHANGE`

Show the decision in the UI and show Bob calling Tessera over MCP.

## 3. Bob executes

Register the execution before edits. Let Bob perform the targeted change and ordinary tests.

## 4. Independent verification catches a hidden regression

Call `evaluate_execution` through Bob/Tessera. The frozen `half_cent_boundary` case should make the initial implementation fail:

- expected `1.01`
- actual `1.00`

Record the failed outcome. Do not alter the fixture.

## 5. Second comparable production route

Create another `formatting_fix` + `billing_formatting` low-risk task and call the normal production route endpoint. Do not force a route.

Expected:

`ASSURANCE / PRIOR_FAST_FAILURE`

Explain that this second task would otherwise have remained FAST; the prior verified failure is the reason for escalation.

## 6. Assurance correction

Have Bob use an Explore subagent to inspect the affected implementation and evidence. Register a new execution. Bob fixes the behavior. Tessera independently re-runs the checks and records the passing outcome.

## 7. Optional Quantum Lab

Only after the core demo is stable, compare exact enumeration and Qiskit QAOA on the same batch request/problem hash. State explicitly that the exact solver is the V1 reference and no quantum advantage is claimed.
