"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {api,Summary,Task} from "@/lib/api";

export default function Home(){
 const [summary,setSummary]=useState<Summary|null>(null); const [tasks,setTasks]=useState<Task[]>([]); const [error,setError]=useState("");
 useEffect(()=>{Promise.all([api.summary(),api.tasks()]).then(([s,t])=>{setSummary(s);setTasks(t)}).catch(e=>setError(String(e)))},[]);
 return <>
  <section className="hero"><div className="eyebrow">Outcome-aware intelligence control plane</div><h1>Route engineering work. Verify the outcome. Learn from evidence.</h1><p>Tessera profiles software tasks, chooses an execution workflow for IBM Bob, independently verifies the resulting code, and preserves the outcome for future routing decisions.</p></section>
  {error&&<div className="notice">API unavailable: {error}</div>}
  <section className="grid">{[["Tasks",summary?.tasks??"—"],["Executions",summary?.executions??"—"],["Verified",summary?.verified??"—"],["Failed evidence",summary?.failed??"—"]].map(([l,v])=><div className="card" key={l}><div className="label">{l}</div><div className="metric">{v}</div></div>)}</section>
  <section className="section"><div className="sectionHead"><div><div className="eyebrow">Core primitive</div><h2>Task → Route → Bob → Verify → Remember → Better route</h2></div><Link href="/tasks"><button>Create task</button></Link></div><div className="flow">{["PROFILE","ROUTE","EXECUTE","VERIFY","OUTCOME","REUSE"].map((x,i)=><div key={x}><b>0{i+1}</b>{x}</div>)}</div></section>
  <section className="section"><div className="sectionHead"><h2>Recent tasks</h2><span className="muted">Real persisted records</span></div><table className="table"><thead><tr><th>Task</th><th>Risk</th><th>Type</th><th>Created</th></tr></thead><tbody>{tasks.slice(0,6).map(t=><tr key={t.id}><td>{t.title}</td><td>{t.risk_level}</td><td>{t.task_type}</td><td>{new Date(t.created_at).toLocaleString()}</td></tr>)}{!tasks.length&&<tr><td colSpan={4} className="muted">No tasks yet. Create the billing demo task.</td></tr>}</tbody></table></section>
 </>
}
