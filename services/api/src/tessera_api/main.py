from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import Database
from .evaluator import EvaluationError, evaluate_billing
from .models import (
    ExecutionComplete,
    ExecutionCreate,
    OptimizationRequest,
    Outcome,
    TaskCreate,
    Workflow,
    utc_now,
)
from .optimization import compare
from .repository import Repository, new_id
from .routing import decide

settings=get_settings(); db=Database(settings.db_path); repo=Repository(db)
app=FastAPI(title="Tessera.ai API",version="0.1.0")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:3000"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])


@app.get("/health")
def health():
    return {"ok":True,"service":"tessera-api","version":"0.1.0"}


@app.post("/api/tasks")
def create_task(req:TaskCreate):
    return repo.create_task(req)


@app.get("/api/tasks")
def list_tasks():
    return repo.list_tasks()


@app.get("/api/tasks/{task_id}")
def get_task(task_id:str):
    task=repo.get_task(task_id)
    if not task: raise HTTPException(404,"task not found")
    return task


@app.post("/api/tasks/{task_id}/route")
def route_task(task_id:str):
    task=repo.get_task(task_id)
    if not task: raise HTTPException(404,"task not found")
    return decide(repo,task,settings.router_bin)


@app.get("/api/tasks/{task_id}/history")
def task_history(task_id:str):
    if not repo.get_task(task_id): raise HTTPException(404,"task not found")
    return repo.task_history(task_id)


@app.post("/api/executions")
def create_execution(req:ExecutionCreate):
    task=repo.get_task(req.task_id); d=repo.get_decision(req.routing_decision_id)
    if not task or not d or d.task_id!=task.id: raise HTTPException(400,"invalid task/decision")
    return repo.create_execution(task.id,d,req.runtime,req.base_commit)


@app.post("/api/executions/{execution_id}/complete")
def complete_execution(execution_id:str,req:ExecutionComplete):
    try: return repo.complete_execution(execution_id,req.result_commit,req.cost_usd)
    except KeyError: raise HTTPException(404,"execution not found")


@app.post("/api/executions/{execution_id}/evaluate")
def evaluate_execution(execution_id:str):
    e=repo.get_execution(execution_id)
    if not e: raise HTTPException(404,"execution not found")
    if e.status!="completed":
        e=repo.complete_execution(execution_id,e.result_commit,e.cost_usd)
    try: return evaluate_billing(repo,execution_id,settings.billing_service_path)
    except EvaluationError as err: raise HTTPException(400,str(err))


@app.post("/api/executions/{execution_id}/record-outcome")
def record_outcome(execution_id:str):
    e=repo.get_execution(execution_id)
    if not e: raise HTTPException(404,"execution not found")
    existing=repo.get_outcome_for_execution(execution_id)
    if existing: return existing
    ev=repo.latest_evaluation(execution_id)
    if not ev: raise HTTPException(400,"evaluate execution first")
    failure=None if ev.verdict=="passed" else "regression"
    o=Outcome(id=new_id("outcome"),execution_id=e.id,task_id=e.task_id,workflow=e.workflow,verified=ev.verdict=="passed",failure_category=failure,observed_elapsed_ms=e.elapsed_ms,recorded_at=utc_now())
    return repo.save_outcome(o)


@app.get("/api/tasks/{task_id}/route-history")
def route_history(task_id:str):
    task=repo.get_task(task_id)
    if not task: raise HTTPException(404,"task not found")
    failed=repo.comparable_failed_workflows(task,utc_now())
    return {"task_id":task_id,"comparable_failed_workflows":failed,"history":repo.task_history(task_id)}


@app.post("/api/optimization/compare")
def optimize(req:OptimizationRequest):
    return compare(req)


@app.get("/api/dashboard/summary")
def dashboard_summary():
    tasks=repo.list_tasks()
    all_exec=[]; outcomes=[]
    for t in tasks:
        h=repo.task_history(t.id); all_exec.extend(h["executions"]); outcomes.extend(h["outcomes"])
    return {"tasks":len(tasks),"executions":len(all_exec),"verified":sum(1 for o in outcomes if o.verified),"failed":sum(1 for o in outcomes if not o.verified),"routes":{"FAST":sum(1 for e in all_exec if e.workflow==Workflow.FAST),"INVESTIGATE":sum(1 for e in all_exec if e.workflow==Workflow.INVESTIGATE),"ASSURANCE":sum(1 for e in all_exec if e.workflow==Workflow.ASSURANCE)}}
