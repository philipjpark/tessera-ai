---
name: tessera-quantum
description: Compare exact classical and optional Qiskit QAOA allocation for a batch of eligible Tessera workflows.
---

# Tessera Quantum Lab Skill

Use only for batch allocation with multiple tasks and meaningful shared constraints.

1. Build the candidate set after hard policy eligibility filtering.
2. Call `optimize_batch` with normalized cost/latency/failure values.
3. Always obtain the exact classical baseline.
4. If QAOA is requested and available, ensure it solves the same problem definition.
5. Compare feasibility, objective value, and elapsed time.
6. Reject any solver candidate that violates hard constraints.
7. Never claim quantum advantage from one small simulation.
8. Report QAOA as an experimental heterogeneous-compute path.
