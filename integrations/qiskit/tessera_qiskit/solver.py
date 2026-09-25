from __future__ import annotations

import time
from typing import Any


def _score(candidate: dict[str, Any], weights: dict[str, float]) -> float:
    return (
        weights["cost"] * float(candidate["cost_units"])
        + weights["latency"] * float(candidate["latency_units"])
        + weights["failure"] * float(candidate["failure_penalty"])
    )


def solve_qaoa(request: dict[str, Any]) -> dict[str, Any]:
    """Solve one Tessera batch-allocation request using a local QAOA experiment.

    This function returns a candidate only. Tessera's control plane must still
    validate all hard constraints before using it.
    """
    from qiskit.primitives import StatevectorSampler
    from qiskit_optimization import QuadraticProgram
    from qiskit_optimization.algorithms import MinimumEigenOptimizer
    from qiskit_optimization.minimum_eigensolvers import QAOA
    from qiskit_optimization.optimizers import COBYLA

    start = time.perf_counter()
    weights = request.get("weights", {"cost": 0.4, "latency": 0.2, "failure": 0.4})
    qp = QuadraticProgram("tessera_batch_allocation")
    candidate_for: dict[str, tuple[str, dict[str, Any]]] = {}
    names_by_task: dict[str, list[str]] = {}

    for task_index, task in enumerate(request["tasks"]):
        task_id = str(task["task_id"])
        names_by_task[task_id] = []
        for candidate_index, candidate in enumerate(task["candidates"]):
            if not bool(candidate.get("eligible", True)):
                continue
            name = f"x_{task_index}_{candidate_index}"
            qp.binary_var(name)
            candidate_for[name] = (task_id, candidate)
            names_by_task[task_id].append(name)

    if any(not names for names in names_by_task.values()):
        return {
            "solver": "qiskit_qaoa",
            "feasible": False,
            "assignment": {},
            "objective": None,
            "elapsed_ms": (time.perf_counter() - start) * 1000,
            "optimality_proven": False,
            "details": {"reason": "task_without_eligible_candidate"},
        }

    qp.minimize(
        linear={
            name: _score(candidate, weights)
            for name, (_, candidate) in candidate_for.items()
        }
    )

    for task_id, names in names_by_task.items():
        qp.linear_constraint(
            linear={name: 1 for name in names},
            sense="==",
            rhs=1,
            name=f"assign_{task_id}",
        )

    max_budget = request.get("max_budget_units")
    if max_budget is not None:
        qp.linear_constraint(
            linear={
                name: float(candidate["cost_units"])
                for name, (_, candidate) in candidate_for.items()
            },
            sense="<=",
            rhs=float(max_budget),
            name="budget",
        )

    qaoa = QAOA(
        sampler=StatevectorSampler(seed=42),
        optimizer=COBYLA(maxiter=60),
        reps=1,
        initial_point=[0.1, 0.1],
    )
    result = MinimumEigenOptimizer(qaoa).solve(qp)

    assignment: dict[str, str] = {}
    for name, value in zip(result.variable_names, result.x):
        if float(value) > 0.5 and name in candidate_for:
            task_id, candidate = candidate_for[name]
            assignment[task_id] = str(candidate["workflow"])

    objective = None
    if len(assignment) == len(request["tasks"]):
        total = 0.0
        for task in request["tasks"]:
            task_id = str(task["task_id"])
            workflow = assignment[task_id]
            candidate = next(
                c for c in task["candidates"]
                if str(c["workflow"]) == workflow
            )
            total += _score(candidate, weights)
        objective = total

    return {
        "solver": "qiskit_qaoa",
        "feasible": len(assignment) == len(request["tasks"]),
        "assignment": assignment,
        "objective": objective,
        "elapsed_ms": (time.perf_counter() - start) * 1000,
        "optimality_proven": False,
        "details": {
            "qiskit_status": str(result.status),
            "reps": 1,
            "sampler": "StatevectorSampler(seed=42)",
            "optimizer": "COBYLA(maxiter=60)",
        },
    }
