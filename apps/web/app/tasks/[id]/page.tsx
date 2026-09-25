"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {api,Decision,Task} from "@/lib/api";

type Check={name?:string;passed?:boolean;details?:{failures?:Array<{name:string;expected:string;actual:string}>;case_count?:number}};
type Evaluation={verdict?:string;checks?:Check[]};
type Exec=Record<string,unknown>&{id?:string;workflow?:string;status?:string;elapsed_ms?:number|null};
type Outcome=Record<string,unknown>&{verified?:boolean;workflow?:string;failure_category?:string|null};
type Hist={task?:Task;decisions?:Decision[];executions?:Exec[];outcomes?:Outcome[]};

export default function TaskDetail(){
 const params=useParams<{id:string}>();const id=params.id;const [h,setH]=useState<Hist>({}),[busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[evaluation,setEvaluation]=useState<Evaluation|null>(null);
 const load=()=>api.history(id).then(x=>setH(x as Hist)).catch(e=>setMsg(String(e))); useEffect(()=>{load()},[id]);
 const latest=h.decisions?.at(-1); const exec=h.executions?.at(-1); const execId=typeof exec?.id==="string"?exec.id:null; const latestOutcome=h.outcomes?.at(-1); const regression=evaluation?.checks?.find(c=>c.name==="golden_regression"); const failures=regression?.details?.failures??[];
 async function start(){if(!latest)return;setBusy(true);try{const e=await api.createExecution({task_id:id,routing_decision_id:latest.id,runtime:"ibm_bob",base_commit:null});setMsg(`Bob execution registered: ${String(e.id)}`);await load()}catch(e){setMsg(String(e))}finally{setBusy(false)}}
 async function evaluate(){if(!execId)return;setBusy(true);try{await api.completeExecution(execId,{});const ev=await api.evaluateExecution(execId) as Evaluation;setEvaluation(ev);setMsg(`Independent evaluation: ${String(ev.verdict)}`);await api.recordOutcome(execId);await load()}catch(e){setMsg(String(e))}finally{setBusy(false)}}
 return <><section className="hero"><div className="eyebrow">Task evidence</div><h1>{h.task?.title??"Loading task…"}</h1><p>{h.task?.description}</p></section>{msg&&<div className="notice">{msg}</div>}
 <section className="two section"><div className="card"><div className="label">Routing decision</div>{latest?<><div className={`metric ${latest.workflow}`}>{latest.workflow}</div><p>{latest.rationale}</p><div className="chips">{latest.reason_codes.map(x=><span className="pill" key={x}>{x}</span>)}</div><button onClick={start} disabled={busy}>Register IBM Bob execution</button></>:<p>No decision yet.</p>}</div>
 <div className="card"><div className="label">IBM Bob execution</div>{exec?<><div className="metric">{String(exec.status??"registered")}</div><p className="muted">Workflow: {String(exec.workflow??latest?.workflow??"—")}</p><p className="muted">Observed elapsed: {typeof exec.elapsed_ms==="number"?`${Math.round(exec.elapsed_ms)} ms`:"Not observed yet"}</p><button onClick={evaluate} disabled={busy||!execId}>Complete + independently evaluate</button></>:<p className="muted">No execution has been registered.</p>}</div></section>
 {evaluation&&<section className={`section evidence ${evaluation.verdict==="passed"?"pass":"fail"}`}><div className="sectionHead"><div><div className="eyebrow">Independent evidence</div><h2>{evaluation.verdict==="passed"?"Verification passed":"Verification failed"}</h2></div><span className="pill">agent cannot self-certify</span></div>{failures.length>0?<div className="failures">{failures.map(f=><div className="failureCard" key={f.name}><b>{f.name}</b><div><span>Expected</span><strong>{f.expected}</strong></div><div><span>Actual</span><strong>{f.actual}</strong></div></div>)}</div>:<p>All frozen regression cases passed.</p>}</section>}
 <section className="section"><div className="sectionHead"><h2>Latest immutable outcome</h2><span className="muted">Failed attempts are never rewritten</span></div>{latestOutcome?<div className="card"><div className="label">{latestOutcome.verified?"Verified":"Failed evidence"}</div><div className={`metric ${String(latestOutcome.workflow??"")}`}>{String(latestOutcome.workflow??"—")}</div><p>{latestOutcome.verified?"Independent checks passed.":`Failure category: ${String(latestOutcome.failure_category??"unknown")}`}</p></div>:<div className="card muted">No outcome recorded yet.</div>}</section></>
}
