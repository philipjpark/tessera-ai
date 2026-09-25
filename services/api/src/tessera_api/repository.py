from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from .db import Database, dumps, loads, dt
from .models import (
    Evaluation,
    Execution,
    Outcome,
    RouteDecision,
    Task,
    TaskCreate,
    Workflow,
    utc_now,
)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


class Repository:
    def __init__(self, db: Database):
        self.db = db

    def create_task(self, req: TaskCreate) -> Task:
        task = Task(id=new_id("task"), **req.model_dump(), created_at=utc_now())
        self.db.execute(
            """INSERT INTO tasks
            (id,title,description,domain,task_type,risk_level,sensitive_area,constraints_json,repository_path,status,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                task.id, task.title, task.description, task.domain, task.task_type,
                task.risk_level.value, task.sensitive_area, dumps(task.constraints.model_dump()),
                task.repository_path, task.status, task.created_at.isoformat(),
            ),
        )
        return task

    def _task_from_row(self, r: dict) -> Task:
        from .models import TaskConstraints, RiskLevel
        return Task(
            id=r["id"], title=r["title"], description=r["description"], domain=r["domain"],
            task_type=r["task_type"], risk_level=RiskLevel(r["risk_level"]), sensitive_area=r["sensitive_area"],
            constraints=TaskConstraints(**loads(r["constraints_json"])), repository_path=r["repository_path"],
            status=r["status"], created_at=dt(r["created_at"]),
        )

    def get_task(self, task_id: str) -> Task | None:
        r = self.db.one("SELECT * FROM tasks WHERE id=?", (task_id,))
        return self._task_from_row(r) if r else None

    def list_tasks(self) -> list[Task]:
        return [self._task_from_row(r) for r in self.db.all("SELECT * FROM tasks ORDER BY created_at DESC")]

    def save_decision(self, d: RouteDecision) -> RouteDecision:
        self.db.execute(
            """INSERT INTO routing_decisions
            (id,task_id,workflow,policy_version,history_cutoff_at,reason_codes_json,rationale,candidate_scores_json,decided_at,forced_experiment)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (d.id,d.task_id,d.workflow.value,d.policy_version,d.history_cutoff_at.isoformat(),dumps(d.reason_codes),d.rationale,dumps(d.candidate_scores),d.decided_at.isoformat(),int(d.forced_experiment)),
        )
        return d

    def get_decision(self, decision_id: str) -> RouteDecision | None:
        r=self.db.one("SELECT * FROM routing_decisions WHERE id=?",(decision_id,))
        if not r: return None
        return RouteDecision(id=r["id"],task_id=r["task_id"],workflow=Workflow(r["workflow"]),policy_version=r["policy_version"],history_cutoff_at=dt(r["history_cutoff_at"]),reason_codes=loads(r["reason_codes_json"]),rationale=r["rationale"],candidate_scores=loads(r["candidate_scores_json"]),decided_at=dt(r["decided_at"]),forced_experiment=bool(r["forced_experiment"]))

    def list_decisions(self, task_id: str) -> list[RouteDecision]:
        rows=self.db.all("SELECT * FROM routing_decisions WHERE task_id=? ORDER BY decided_at",(task_id,))
        return [self.get_decision(r["id"]) for r in rows if r]

    def create_execution(self, task_id: str, decision: RouteDecision, runtime: str, base_commit: str | None) -> Execution:
        e=Execution(id=new_id("exec"),task_id=task_id,routing_decision_id=decision.id,runtime=runtime,workflow=decision.workflow,base_commit=base_commit,started_at=utc_now())
        self.db.execute("""INSERT INTO executions
        (id,task_id,routing_decision_id,runtime,workflow,base_commit,result_commit,started_at,completed_at,elapsed_ms,cost_usd,retry_count,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (e.id,e.task_id,e.routing_decision_id,e.runtime,e.workflow.value,e.base_commit,e.result_commit,e.started_at.isoformat(),None,None,None,0,e.status))
        return e

    def _execution_from_row(self,r:dict)->Execution:
        return Execution(id=r["id"],task_id=r["task_id"],routing_decision_id=r["routing_decision_id"],runtime=r["runtime"],workflow=Workflow(r["workflow"]),base_commit=r["base_commit"],result_commit=r["result_commit"],started_at=dt(r["started_at"]),completed_at=dt(r["completed_at"]),elapsed_ms=r["elapsed_ms"],cost_usd=r["cost_usd"],retry_count=r["retry_count"],status=r["status"])

    def get_execution(self, execution_id:str)->Execution|None:
        r=self.db.one("SELECT * FROM executions WHERE id=?",(execution_id,))
        return self._execution_from_row(r) if r else None

    def complete_execution(self, execution_id:str, result_commit:str|None, cost_usd:float|None)->Execution:
        e=self.get_execution(execution_id)
        if not e: raise KeyError(execution_id)
        completed=utc_now(); elapsed=(completed-e.started_at).total_seconds()*1000
        self.db.execute("UPDATE executions SET result_commit=?, completed_at=?, elapsed_ms=?, cost_usd=?, status='completed' WHERE id=?",(result_commit,completed.isoformat(),elapsed,cost_usd,execution_id))
        return self.get_execution(execution_id)

    def save_evaluation(self, ev:Evaluation)->Evaluation:
        self.db.execute("""INSERT INTO evaluations(id,execution_id,verdict,checks_json,evidence_artifact_ids_json,evaluated_at)
        VALUES (?,?,?,?,?,?)""",(ev.id,ev.execution_id,ev.verdict,dumps([c.model_dump() for c in ev.checks]),dumps(ev.evidence_artifact_ids),ev.evaluated_at.isoformat()))
        return ev

    def latest_evaluation(self, execution_id:str)->Evaluation|None:
        from .models import CheckResult
        r=self.db.one("SELECT * FROM evaluations WHERE execution_id=? ORDER BY evaluated_at DESC LIMIT 1",(execution_id,))
        if not r: return None
        return Evaluation(id=r["id"],execution_id=r["execution_id"],verdict=r["verdict"],checks=[CheckResult(**x) for x in loads(r["checks_json"])],evidence_artifact_ids=loads(r["evidence_artifact_ids_json"]),evaluated_at=dt(r["evaluated_at"]))

    def save_artifact(self, execution_id:str, artifact_type:str, content_hash:str, storage_path:str)->str:
        artifact_id=new_id("artifact")
        self.db.execute("INSERT INTO evidence_artifacts(id,execution_id,artifact_type,content_hash,storage_path,created_at) VALUES (?,?,?,?,?,?)",(artifact_id,execution_id,artifact_type,content_hash,storage_path,utc_now().isoformat()))
        return artifact_id

    def save_outcome(self, o:Outcome)->Outcome:
        self.db.execute("""INSERT INTO outcomes(id,execution_id,task_id,workflow,verified,failure_category,observed_elapsed_ms,recorded_at)
        VALUES (?,?,?,?,?,?,?,?)""",(o.id,o.execution_id,o.task_id,o.workflow.value,int(o.verified),o.failure_category,o.observed_elapsed_ms,o.recorded_at.isoformat()))
        return o

    def get_outcome_for_execution(self, execution_id:str)->Outcome|None:
        r=self.db.one("SELECT * FROM outcomes WHERE execution_id=?",(execution_id,))
        if not r: return None
        return Outcome(id=r["id"],execution_id=r["execution_id"],task_id=r["task_id"],workflow=Workflow(r["workflow"]),verified=bool(r["verified"]),failure_category=r["failure_category"],observed_elapsed_ms=r["observed_elapsed_ms"],recorded_at=dt(r["recorded_at"]))

    def comparable_failed_workflows(self, task:Task, cutoff:datetime)->list[str]:
        rows=self.db.all("""SELECT o.workflow,t.task_type,t.domain,t.sensitive_area,o.recorded_at
        FROM outcomes o JOIN tasks t ON t.id=o.task_id
        WHERE o.verified=0 AND o.recorded_at<=? AND t.task_type=? AND t.domain=?
          AND COALESCE(t.sensitive_area,'')=COALESCE(?, '')""",
        (cutoff.isoformat(),task.task_type,task.domain,task.sensitive_area))
        return sorted({r["workflow"] for r in rows})

    def task_history(self, task_id:str)->dict:
        executions=[self._execution_from_row(r) for r in self.db.all("SELECT * FROM executions WHERE task_id=? ORDER BY started_at",(task_id,))]
        return {"task": self.get_task(task_id), "decisions": self.list_decisions(task_id), "executions": executions, "outcomes": [self.get_outcome_for_execution(e.id) for e in executions if self.get_outcome_for_execution(e.id)]}
