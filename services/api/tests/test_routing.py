from pathlib import Path

from tessera_api.db import Database
from tessera_api.models import RiskLevel, TaskConstraints, TaskCreate, Workflow, Outcome, utc_now
from tessera_api.repository import Repository, new_id
from tessera_api.routing import decide


def make_repo(tmp_path: Path) -> Repository:
    return Repository(Database(tmp_path / "t.db"))


def test_high_risk_behavior_preservation_routes_assurance(tmp_path):
    repo = make_repo(tmp_path)
    task = repo.create_task(
        TaskCreate(
            title="Fix money rounding",
            description="Preserve behavior",
            risk_level=RiskLevel.high,
            sensitive_area="financial_logic",
            constraints=TaskConstraints(require_behavior_preservation=True),
        )
    )
    decision = decide(repo, task)
    assert decision.workflow == Workflow.ASSURANCE
    assert "HIGH_RISK" in decision.reason_codes
    assert "BEHAVIOR_PRESERVATION_REQUIRED" in decision.reason_codes
    assert decision.candidate_scores["FAST"] is None


def test_low_risk_formatting_routes_fast_before_failure_history(tmp_path):
    repo = make_repo(tmp_path)
    task = repo.create_task(
        TaskCreate(
            title="Normalize billing output",
            description="Targeted formatting change",
            task_type="formatting_fix",
            risk_level=RiskLevel.low,
            sensitive_area="billing_formatting",
        )
    )
    decision = decide(repo, task)
    assert decision.workflow == Workflow.FAST
    assert "LOW_RISK_TARGETED_CHANGE" in decision.reason_codes


def test_prior_fast_failure_causes_real_escalation_for_comparable_low_risk_task(tmp_path):
    repo = make_repo(tmp_path)
    first = repo.create_task(
        TaskCreate(
            title="Billing format one",
            description="Targeted formatting",
            task_type="formatting_fix",
            risk_level=RiskLevel.low,
            sensitive_area="billing_formatting",
        )
    )
    first_decision = decide(repo, first)
    assert first_decision.workflow == Workflow.FAST
    execution = repo.create_execution(first.id, first_decision, "ibm_bob", None)
    execution = repo.complete_execution(execution.id, None, None)
    repo.save_outcome(
        Outcome(
            id=new_id("outcome"),
            execution_id=execution.id,
            task_id=first.id,
            workflow=Workflow.FAST,
            verified=False,
            failure_category="regression",
            observed_elapsed_ms=execution.elapsed_ms,
            recorded_at=utc_now(),
        )
    )

    second = repo.create_task(
        TaskCreate(
            title="Billing format two",
            description="Comparable targeted formatting",
            task_type="formatting_fix",
            risk_level=RiskLevel.low,
            sensitive_area="billing_formatting",
        )
    )
    decision = decide(repo, second)
    assert decision.workflow == Workflow.ASSURANCE
    assert "PRIOR_FAST_FAILURE" in decision.reason_codes
    assert decision.candidate_scores["FAST"] is None


def test_future_failure_is_not_visible_before_cutoff(tmp_path):
    from datetime import timedelta
    repo = make_repo(tmp_path)
    first = repo.create_task(TaskCreate(title="future", description="future", task_type="formatting_fix", risk_level=RiskLevel.low, sensitive_area="billing_formatting"))
    first_decision = decide(repo, first)
    execution = repo.create_execution(first.id, first_decision, "ibm_bob", None)
    execution = repo.complete_execution(execution.id, None, None)
    future_time = utc_now() + timedelta(days=1)
    repo.save_outcome(Outcome(id=new_id("outcome"), execution_id=execution.id, task_id=first.id, workflow=Workflow.FAST, verified=False, failure_category="regression", observed_elapsed_ms=execution.elapsed_ms, recorded_at=future_time))
    second = repo.create_task(TaskCreate(title="now", description="now", task_type="formatting_fix", risk_level=RiskLevel.low, sensitive_area="billing_formatting"))
    decision = decide(repo, second)
    assert decision.workflow == Workflow.FAST
    assert "PRIOR_FAST_FAILURE" not in decision.reason_codes
