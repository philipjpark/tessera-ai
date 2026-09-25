from __future__ import annotations

import tempfile
from pathlib import Path

from .db import Database
from .models import (
    Candidate,
    OptimizationRequest,
    OptimizationTask,
    Outcome,
    RiskLevel,
    TaskConstraints,
    TaskCreate,
    Workflow,
    utc_now,
)
from .optimization import compare
from .repository import Repository, new_id
from .routing import decide


def run() -> None:
    with tempfile.TemporaryDirectory() as td:
        repo = Repository(Database(Path(td) / "demo.db"))

        first = repo.create_task(
            TaskCreate(
                title="Normalize billing currency output",
                description="Make the billing output formatting consistent with a targeted change.",
                task_type="formatting_fix",
                risk_level=RiskLevel.low,
                sensitive_area="billing_formatting",
                constraints=TaskConstraints(require_tests=True),
            )
        )
        first_decision = decide(repo, first)
        assert first_decision.workflow == Workflow.FAST
        first_execution = repo.create_execution(first.id, first_decision, "ibm_bob", None)
        first_execution = repo.complete_execution(first_execution.id, None, None)
        repo.save_outcome(
            Outcome(
                id=new_id("outcome"),
                execution_id=first_execution.id,
                task_id=first.id,
                workflow=Workflow.FAST,
                verified=False,
                failure_category="regression",
                observed_elapsed_ms=first_execution.elapsed_ms,
                recorded_at=utc_now(),
            )
        )

        second = repo.create_task(
            TaskCreate(
                title="Correct another billing formatting edge case",
                description="Comparable low-risk billing formatting change.",
                task_type="formatting_fix",
                risk_level=RiskLevel.low,
                sensitive_area="billing_formatting",
                constraints=TaskConstraints(require_tests=True),
            )
        )
        second_decision = decide(repo, second)

        print("First production decision:", first_decision.workflow.value, first_decision.reason_codes)
        print("Persisted first outcome: FAST -> failed")
        print("Comparable next decision:", second_decision.workflow.value, second_decision.reason_codes)

        req = OptimizationRequest(
            tasks=[
                OptimizationTask(
                    task_id="docs",
                    candidates=[
                        Candidate(workflow=Workflow.FAST, cost_units=8, latency_units=6, failure_penalty=1),
                        Candidate(workflow=Workflow.ASSURANCE, cost_units=30, latency_units=25, failure_penalty=0.5),
                    ],
                ),
                OptimizationTask(
                    task_id="billing",
                    candidates=[
                        Candidate(workflow=Workflow.INVESTIGATE, cost_units=25, latency_units=18, failure_penalty=8),
                        Candidate(workflow=Workflow.ASSURANCE, cost_units=40, latency_units=28, failure_penalty=1),
                    ],
                ),
                OptimizationTask(
                    task_id="concurrency",
                    candidates=[
                        Candidate(workflow=Workflow.INVESTIGATE, cost_units=28, latency_units=22, failure_penalty=4),
                        Candidate(workflow=Workflow.ASSURANCE, cost_units=45, latency_units=33, failure_penalty=2),
                    ],
                ),
            ],
            max_budget_units=100,
            run_qaoa=False,
        )
        result = compare(req)
        print(
            "Exact allocation:",
            {k: v.value for k, v in result.selected_assignment.items()},
            "objective",
            result.exact.objective,
        )


if __name__ == "__main__":
    run()
