from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RiskLevel(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class Workflow(StrEnum):
    FAST = "FAST"
    INVESTIGATE = "INVESTIGATE"
    ASSURANCE = "ASSURANCE"


class TaskConstraints(BaseModel):
    require_tests: bool = True
    require_behavior_preservation: bool = False
    require_human_approval: bool = False
    max_execution_seconds: int | None = Field(default=300, ge=1)
    budget_units: float | None = Field(default=100.0, ge=0)


class TaskCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3, max_length=5000)
    domain: str = "software_engineering"
    task_type: str = "bug_fix"
    risk_level: RiskLevel = RiskLevel.medium
    sensitive_area: str | None = None
    constraints: TaskConstraints = Field(default_factory=TaskConstraints)
    repository_path: str | None = None


class Task(TaskCreate):
    id: str
    status: str = "created"
    created_at: datetime


class RouteDecision(BaseModel):
    id: str
    task_id: str
    workflow: Workflow
    policy_version: str = "v1"
    history_cutoff_at: datetime
    reason_codes: list[str]
    rationale: str
    candidate_scores: dict[str, float | None]
    decided_at: datetime
    forced_experiment: bool = False


class ExecutionCreate(BaseModel):
    task_id: str
    routing_decision_id: str
    runtime: str = "ibm_bob"
    base_commit: str | None = None


class Execution(BaseModel):
    id: str
    task_id: str
    routing_decision_id: str
    runtime: str
    workflow: Workflow
    base_commit: str | None = None
    result_commit: str | None = None
    started_at: datetime
    completed_at: datetime | None = None
    elapsed_ms: float | None = None
    cost_usd: float | None = None
    retry_count: int = 0
    status: str = "started"


class ExecutionComplete(BaseModel):
    result_commit: str | None = None
    cost_usd: float | None = Field(default=None, ge=0)


class CheckResult(BaseModel):
    name: str
    passed: bool
    details: dict[str, Any] = Field(default_factory=dict)


class Evaluation(BaseModel):
    id: str
    execution_id: str
    verdict: Literal["passed", "failed", "review_required"]
    checks: list[CheckResult]
    evidence_artifact_ids: list[str]
    evaluated_at: datetime


class Outcome(BaseModel):
    id: str
    execution_id: str
    task_id: str
    workflow: Workflow
    verified: bool
    failure_category: str | None = None
    observed_elapsed_ms: float | None = None
    recorded_at: datetime


class Candidate(BaseModel):
    workflow: Workflow
    cost_units: float = Field(ge=0)
    latency_units: float = Field(ge=0)
    failure_penalty: float = Field(ge=0)
    eligible: bool = True


class OptimizationTask(BaseModel):
    task_id: str
    candidates: list[Candidate] = Field(min_length=1)


class OptimizationWeights(BaseModel):
    cost: float = Field(default=0.4, ge=0)
    latency: float = Field(default=0.2, ge=0)
    failure: float = Field(default=0.4, ge=0)


class OptimizationRequest(BaseModel):
    tasks: list[OptimizationTask] = Field(min_length=1, max_length=8)
    max_budget_units: float | None = Field(default=None, ge=0)
    weights: OptimizationWeights = Field(default_factory=OptimizationWeights)
    run_qaoa: bool = False


class SolverResult(BaseModel):
    solver: str
    feasible: bool
    assignment: dict[str, Workflow]
    objective: float | None
    elapsed_ms: float
    optimality_proven: bool
    details: dict[str, Any] = Field(default_factory=dict)


class OptimizationComparison(BaseModel):
    problem_hash: str
    exact: SolverResult
    qaoa: SolverResult | None
    quantum_available: bool
    selected_solver: str
    selected_assignment: dict[str, Workflow]
