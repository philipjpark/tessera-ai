from tessera_api.models import Candidate, OptimizationRequest, OptimizationTask, Workflow
from tessera_api.optimization import compare, exact_solve, validate_assignment


def request(run_qaoa: bool = False) -> OptimizationRequest:
    return OptimizationRequest(
        tasks=[
            OptimizationTask(
                task_id="a",
                candidates=[
                    Candidate(workflow=Workflow.FAST, cost_units=10, latency_units=5, failure_penalty=3),
                    Candidate(workflow=Workflow.ASSURANCE, cost_units=40, latency_units=20, failure_penalty=0),
                ],
            ),
            OptimizationTask(
                task_id="b",
                candidates=[
                    Candidate(workflow=Workflow.FAST, cost_units=10, latency_units=5, failure_penalty=10),
                    Candidate(workflow=Workflow.ASSURANCE, cost_units=40, latency_units=20, failure_penalty=0),
                ],
            ),
        ],
        max_budget_units=50,
        run_qaoa=run_qaoa,
    )


def test_exact_solver_respects_budget():
    req = request()
    result = exact_solve(req)
    assert result.feasible
    ok, _ = validate_assignment(req, result.assignment)
    assert ok
    assert result.optimality_proven


def test_quantum_path_is_optional_and_never_blocks_exact_result():
    result = compare(request(run_qaoa=True))
    assert result.exact.feasible
    assert result.selected_solver == "exact"
    assert result.selected_assignment == result.exact.assignment
