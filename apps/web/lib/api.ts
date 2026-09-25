export const API = process.env.NEXT_PUBLIC_TESSERA_API_URL ?? "http://localhost:8000";

export type Workflow = "FAST" | "INVESTIGATE" | "ASSURANCE";
export type Task = {
  id:string; title:string; description:string; domain:string; task_type:string;
  risk_level:"low"|"medium"|"high"; sensitive_area:string|null; status:string; created_at:string;
  constraints:{require_tests:boolean;require_behavior_preservation:boolean;require_human_approval:boolean;max_execution_seconds:number|null;budget_units:number|null}
};
export type Decision = {id:string;task_id:string;workflow:Workflow;reason_codes:string[];rationale:string;candidate_scores:Record<string,number|null>;forced_experiment:boolean;decided_at:string};
export type Summary = {tasks:number;executions:number;verified:number;failed:number;routes:Record<Workflow,number>};

async function json<T>(path:string, init?:RequestInit):Promise<T>{
  const res=await fetch(`${API}${path}`,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})},cache:"no-store"});
  if(!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
export const api={
  summary:()=>json<Summary>("/api/dashboard/summary"),
  tasks:()=>json<Task[]>("/api/tasks"),
  createTask:(body:unknown)=>json<Task>("/api/tasks",{method:"POST",body:JSON.stringify(body)}),
  route:(id:string)=>json<Decision>(`/api/tasks/${id}/route`,{method:"POST"}),
  history:(id:string)=>json<Record<string,unknown>>(`/api/tasks/${id}/history`),
  createExecution:(body:unknown)=>json<Record<string,unknown>>("/api/executions",{method:"POST",body:JSON.stringify(body)}),
  completeExecution:(id:string,body:unknown={})=>json<Record<string,unknown>>(`/api/executions/${id}/complete`,{method:"POST",body:JSON.stringify(body)}),
  evaluateExecution:(id:string)=>json<Record<string,unknown>>(`/api/executions/${id}/evaluate`,{method:"POST"}),
  recordOutcome:(id:string)=>json<Record<string,unknown>>(`/api/executions/${id}/record-outcome`,{method:"POST"}),
  optimize:(body:unknown)=>json<Record<string,unknown>>("/api/optimization/compare",{method:"POST",body:JSON.stringify(body)}),
};
