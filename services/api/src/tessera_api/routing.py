from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from datetime import datetime

from .models import RouteDecision, Task, Workflow, utc_now
from .repository import Repository, new_id

SENSITIVE_AREAS = {"financial_logic", "auth", "security", "payments", "permissions", "database_migration", "infrastructure"}


@dataclass(frozen=True)
class RouteContext:
    prior_failed_workflows: list[str]


def _python_route(task: Task, ctx: RouteContext) -> tuple[Workflow,list[str],dict[str,float|None],str]:
    reasons: list[str] = []
    scores: dict[str, float | None] = {"FAST": 10.0, "INVESTIGATE": 24.0, "ASSURANCE": 42.0}

    if task.risk_level.value == "high":
        reasons.append("HIGH_RISK")
        scores["FAST"] = None
        scores["ASSURANCE"] = 12.0
    elif task.risk_level.value == "medium":
        reasons.append("MEDIUM_RISK")
        scores["FAST"] = 30.0
        scores["INVESTIGATE"] = 16.0

    if task.sensitive_area in SENSITIVE_AREAS:
        reasons.append("SENSITIVE_AREA")
        scores["FAST"] = None
        scores["ASSURANCE"] = min(scores["ASSURANCE"] or 999, 11.0)

    if task.constraints.require_behavior_preservation:
        reasons.append("BEHAVIOR_PRESERVATION_REQUIRED")
        scores["FAST"] = None
        scores["ASSURANCE"] = min(scores["ASSURANCE"] or 999, 8.0)

    if task.constraints.require_human_approval:
        reasons.append("HUMAN_APPROVAL_REQUIRED")
        scores["FAST"] = None
        scores["ASSURANCE"] = min(scores["ASSURANCE"] or 999, 9.0)

    if "FAST" in ctx.prior_failed_workflows:
        reasons.append("PRIOR_FAST_FAILURE")
        scores["FAST"] = None
        scores["ASSURANCE"] = min(scores["ASSURANCE"] or 999, 7.0)

    if task.task_type in {"investigation", "concurrency_bug", "architecture"} and scores["FAST"] is not None:
        reasons.append("REPOSITORY_CONTEXT_REQUIRED")
        scores["FAST"] = 35.0
        scores["INVESTIGATE"] = 10.0

    eligible = [(Workflow(k),v) for k,v in scores.items() if v is not None]
    workflow,_ = min(eligible, key=lambda kv: kv[1])
    if not reasons:
        reasons.append("LOW_RISK_TARGETED_CHANGE")
    rationale = {
        Workflow.FAST: "Low-risk targeted work can use the minimal verified workflow.",
        Workflow.INVESTIGATE: "The task needs repository investigation before implementation.",
        Workflow.ASSURANCE: "Risk, behavior-preservation, approval, or prior-failure evidence requires independent assurance.",
    }[workflow]
    return workflow,reasons,scores,rationale


def _rust_route(router_bin: str, task: Task, ctx: RouteContext):
    payload={"task": task.model_dump(mode="json"), "prior_failed_workflows": ctx.prior_failed_workflows}
    proc=subprocess.run([router_bin,"route"],input=json.dumps(payload),capture_output=True,text=True,timeout=5,check=True)
    out=json.loads(proc.stdout)
    return Workflow(out["workflow"]),out["reason_codes"],out["candidate_scores"],out["rationale"]


def decide(repo: Repository, task: Task, router_bin: str | None = None, forced_workflow: Workflow | None = None) -> RouteDecision:
    now=utc_now(); prior=repo.comparable_failed_workflows(task, now)
    ctx=RouteContext(prior_failed_workflows=prior)
    if router_bin and not forced_workflow:
        try:
            workflow,reasons,scores,rationale=_rust_route(router_bin,task,ctx)
        except (OSError, subprocess.SubprocessError, ValueError, json.JSONDecodeError):
            workflow,reasons,scores,rationale=_python_route(task,ctx)
            reasons.append("RUST_ROUTER_FALLBACK")
    else:
        workflow,reasons,scores,rationale=_python_route(task,ctx)

    forced=False
    if forced_workflow:
        forced=True
        workflow=forced_workflow
        reasons=["CONTROLLED_EXPERIMENT_OVERRIDE", *reasons]
        rationale=f"Controlled experiment override selected {workflow.value}; this is not the production policy recommendation."

    d=RouteDecision(id=new_id("decision"),task_id=task.id,workflow=workflow,history_cutoff_at=now,reason_codes=reasons,rationale=rationale,candidate_scores=scores,decided_at=now,forced_experiment=forced)
    return repo.save_decision(d)
