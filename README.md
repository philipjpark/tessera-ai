# Tessera.ai V1 — IBM Bob + Qiskit Hackathon Build

**Tagline:** Route intelligence. Verify outcomes.

Tessera.ai is an outcome-aware developer-workflow control plane. For this hackathon V1 it improves a concrete software-maintenance workflow:

`Task -> Profile -> Route -> IBM Bob -> Independent Verification -> Outcome Evidence -> Better Future Route`

The prototype is intentionally narrow. IBM Bob is the software-engineering runtime. Tessera owns workflow selection, policy, independent verification, evidence, and point-in-time outcome memory. Qiskit is an optional heterogeneous-compute experiment for batch workflow allocation; the exact classical solver remains the V1 reference.

## Why this exists

AI coding agents can produce changes quickly, but the same workflow depth is not appropriate for every task and the agent that generated a change should not be the only system deciding whether it is correct. Tessera makes the execution decision explicit, independently verifies the resulting artifact, and stores failed as well as successful outcomes so later comparable work can be routed differently.

## Golden demo

1. Submit a genuinely low-risk billing-formatting task.
2. Tessera routes it to `FAST` under the production policy.
3. IBM Bob performs the change.
4. Ordinary tests pass, but Tessera's frozen regression fixture catches a rounding edge case.
5. The failed FAST outcome is stored immutably.
6. Submit a comparable low-risk task.
7. The production policy now selects `ASSURANCE` because `PRIOR_FAST_FAILURE` is part of the available point-in-time evidence.
8. Bob investigates/corrects the behavior; Tessera independently verifies the result.
9. Optional Quantum Lab compares exact classical allocation and Qiskit QAOA on the same small batch problem.

The important claim is **evidence-informed routing**, not self-learning AI and not quantum advantage.

## Repository layout

```text
apps/web/                         Next.js + TypeScript UI
services/api/                     FastAPI control plane, SQLite, evaluator
crates/router/                    Rust deterministic route policy
integrations/ibm-bob/             IBM Bob-specific runtime integration
  mcp-server/                     TypeScript MCP bridge
  README.md                       Bob setup and operating contract
  DEMO_PROMPTS.md                 prompts for the recorded demonstration
integrations/qiskit/              isolated Qiskit solver adapter
  tessera_qiskit/                 QAOA implementation
  run_qaoa.py                     stdin/stdout adapter used by Tessera
examples/billing-service/         controlled target codebase + frozen fixtures
.bob/                             Bob project mode, MCP config, rules, skills
bob_sessions/                     required Bob session-summary screenshots
docs/                             architecture, schema, pitch, demo docs
scripts/                          smoke/demo helpers
```

## Start locally

### 1. API

```bash
cd services/api
python -m venv .venv
# activate it
pip install -e '.[dev]'
pytest -q
uvicorn tessera_api.main:app --reload --port 8000
```

### 2. Web + Bob MCP bridge

From the repository root:

```bash
npm install
npm run typecheck
npm --workspace @tessera/ibm-bob-mcp run build
npm run web
```

### 3. IBM Bob

Open this repository root in Bob IDE. Use the hackathon-provisioned account. Bob should discover:

- `.bob/custom_modes.yaml`
- `.bob/mcp.json`
- `.bob/skills/tessera-route/SKILL.md`
- `.bob/skills/tessera-evaluate/SKILL.md`
- `.bob/skills/tessera-quantum/SKILL.md`

Select **Tessera Engineer**, verify the `tessera` project MCP server is enabled, then use the prompts in `integrations/ibm-bob/DEMO_PROMPTS.md`.

### 4. Optional Qiskit integration

The Qiskit adapter is deliberately isolated from API startup.

```bash
python -m venv .venv-qiskit
# activate it
pip install -r integrations/qiskit/requirements.txt
python integrations/qiskit/run_qaoa.py < integrations/qiskit/example_request.json
```

The current adapter targets the modern Qiskit Optimization API: `StatevectorSampler`, `MinimumEigenOptimizer`, `qiskit_optimization.minimum_eigensolvers.QAOA`, and `COBYLA`.

## Validation principles

- Never invent Bob model IDs, token counts, internal routes, or costs.
- Never rewrite a failed attempt into a success; create a new execution.
- Never let Bob self-certify. Tessera's deterministic evaluator owns the verdict.
- Hard security/review requirements are eligibility constraints, not soft optimizer penalties.
- Historical routing may only use evidence available at decision time.
- QAOA output is a candidate until Tessera validates it against the same hard constraints as the classical solution.

## Hackathon evidence

Each participant should save the required Bob IDE task-session summary screenshots under `bob_sessions/`. See `bob_sessions/README.md` for filenames and a suggested capture plan.

## External AI-IDE system prompt

The long build prompt is intentionally **not embedded in this repository**. Use the separately delivered `TESSERA_EXTERNAL_AI_IDE_SYSTEM_PROMPT.md` in your coding IDE. It contains the product mission, engineering boundaries, Bob/Qiskit integration rules, 48-hour priorities, acceptance criteria, and detailed continuation plan.
