from __future__ import annotations

import hashlib
import itertools
import json
import subprocess
import sys
import time
from pathlib import Path

from .models import OptimizationComparison, OptimizationRequest, SolverResult, Workflow


def _problem_hash(req: OptimizationRequest) -> str:
    raw = req.model_dump_json(exclude_none=False)
    return "sha256:" + hashlib.sha256(raw.encode()).hexdigest()


def _score(candidate, weights) -> float:
    return (
        weights.cost * candidate.cost_units
        + weights.latency * candidate.latency_units
        + weights.failure * candidate.failure_penalty
    )


def validate_assignment(req: OptimizationRequest, assignment: dict[str, Workflow]) -> tuple[bool, str]:
    budget = 0.0
    for task in req.tasks:
        selected = assignment.get(task.task_id)
        if selected is None:
            return False, f"missing assignment for {task.task_id}"
        candidates = [c for c in task.candidates if c.workflow == selected]
        if not candidates or not candidates[0].eligible:
            return False, f"ineligible assignment {task.task_id}->{selected}"
        budget += candidates[0].cost_units
    if req.max_budget_units is not None and budget > req.max_budget_units + 1e-9:
        return False, f"budget {budget} exceeds {req.max_budget_units}"
    return True, "ok"


def exact_solve(req: OptimizationRequest) -> SolverResult:
    start = time.perf_counter()
    eligible = []
    for task in req.tasks:
        candidates = [c for c in task.candidates if c.eligible]
        if not candidates:
            return SolverResult(
                solver="exact_enumeration",
                feasible=False,
                assignment={},
                objective=None,
                elapsed_ms=(time.perf_counter() - start) * 1000,
                optimality_proven=True,
                details={"reason": f"no eligible candidate for {task.task_id}"},
            )
        eligible.append(candidates)

    best = None
    for combo in itertools.product(*eligible):
        assignment = {task.task_id: c.workflow for task, c in zip(req.tasks, combo)}
        ok, _ = validate_assignment(req, assignment)
        if not ok:
            continue
        objective = sum(_score(c, req.weights) for c in combo)
        if best is None or objective < best[0]:
            best = (objective, assignment)

    elapsed = (time.perf_counter() - start) * 1000
    if best is None:
        return SolverResult(
            solver="exact_enumeration",
            feasible=False,
            assignment={},
            objective=None,
            elapsed_ms=elapsed,
            optimality_proven=True,
        )
    return SolverResult(
        solver="exact_enumeration",
        feasible=True,
        assignment=best[1],
        objective=best[0],
        elapsed_ms=elapsed,
        optimality_proven=True,
    )


def _qiskit_adapter_path() -> Path:
    repo_root = Path(__file__).resolve().parents[4]
    return repo_root / "integrations" / "qiskit" / "run_qaoa.py"


def qaoa_solve(req: OptimizationRequest) -> SolverResult:
    """Invoke the optional Qiskit integration as an isolated subprocess.

    Keeping Qiskit out of the API process prevents optional quantum dependencies
    from becoming a critical startup/runtime dependency.
    """
    start = time.perf_counter()
    script = _qiskit_adapter_path()
    if not script.exists():
        raise RuntimeError(f"Qiskit adapter missing: {script}")

    proc = subprocess.run(
        [sys.executable, str(script)],
        input=req.model_dump_json(exclude_none=False),
        text=True,
        capture_output=True,
        timeout=90,
    )
    if proc.returncode != 0:
        stderr = proc.stderr.strip()[-2000:]
        raise RuntimeError(f"Qiskit adapter unavailable or failed: {stderr}")

    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Qiskit adapter returned invalid JSON") from exc

    raw_assignment = payload.get("assignment", {})
    assignment: dict[str, Workflow] = {}
    for task_id, workflow in raw_assignment.items():
        try:
            assignment[str(task_id)] = Workflow(str(workflow))
        except ValueError:
            continue

    feasible, validation = validate_assignment(req, assignment)
    elapsed = (time.perf_counter() - start) * 1000
    details = dict(payload.get("details", {}))
    details["tessera_validation"] = validation
    details["adapter_elapsed_ms"] = elapsed

    objective = payload.get("objective") if feasible else None
    return SolverResult(
        solver="qiskit_qaoa",
        feasible=feasible,
        assignment=assignment if feasible else {},
        objective=objective,
        elapsed_ms=float(payload.get("elapsed_ms", elapsed)),
        optimality_proven=False,
        details=details,
    )


def compare(req: OptimizationRequest) -> OptimizationComparison:
    exact = exact_solve(req)
    qaoa = None
    quantum_available = False
    if req.run_qaoa:
        try:
            qaoa = qaoa_solve(req)
            quantum_available = True
        except RuntimeError as exc:
            qaoa = SolverResult(
                solver="qiskit_qaoa",
                feasible=False,
                assignment={},
                objective=None,
                elapsed_ms=0.0,
                optimality_proven=False,
                details={"unavailable": True, "reason": str(exc)},
            )
            quantum_available = False

    selected = "exact"
    assignment = exact.assignment
    if not exact.feasible and qaoa and qaoa.feasible:
        selected = "qaoa"
        assignment = qaoa.assignment

    return OptimizationComparison(
        problem_hash=_problem_hash(req),
        exact=exact,
        qaoa=qaoa,
        quantum_available=quantum_available,
        selected_solver=selected,
        selected_assignment=assignment,
    )
