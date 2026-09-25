# Tessera.ai — hackathon pitch

## Problem

Agentic coding tools can modify real codebases quickly, but engineering teams still lack a simple way to decide **how much investigation and verification a task deserves**, independently verify what the agent changed, and reuse failure evidence so the same mistake is not repeated on comparable work.

## Buyer

Engineering platform, security, and quality leaders adopting Bob/Copilot/Claude Code/Codex across risk-sensitive repositories.

## Product

Tessera is an outcome-aware workflow control plane:

`Task -> Route -> Bob -> Independent Verify -> Outcome -> Better Future Route`

The V1 routes tasks through `FAST`, `INVESTIGATE`, or `ASSURANCE`. IBM Bob performs the engineering work. Tessera independently verifies the result using evidence captured outside the agent's own success claim. Failed attempts remain immutable historical evidence.

## Why now

Agentic coding systems are becoming capable enough to act across full repositories. That makes the bottleneck less about generating code and more about allocating verification effort, containing blast radius, and knowing when an agentic execution actually produced a safe result.

## Wedge

Start with high-consequence maintenance workflows in fintech, healthcare, infrastructure, identity, and other environments where verification/review policies already have budget and ownership.

## Why not simply trust the agent's own tests?

The agent that generated the change should not be the only system certifying it. Tessera uses frozen or independently controlled evidence and retains the result even when the attempt fails.

## Business model hypothesis

Enterprise SaaS / governance add-on priced per engineering team or managed repository, with usage-based evaluation/retained evidence at scale.

## Hackathon impact metrics

Measure rather than pre-fill:

- end-to-end elapsed time
- failed verification attempts
- retries/rework
- human interventions
- verified completion
- whether historical evidence changed a later route
