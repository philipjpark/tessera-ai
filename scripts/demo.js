#!/usr/bin/env node
// Minimal JavaScript smoke client. Run after starting the API.
const API=process.env.TESSERA_API_URL ?? "http://localhost:8000";
const j=async(path,init={})=>{const r=await fetch(API+path,{...init,headers:{"Content-Type":"application/json"}});if(!r.ok)throw new Error(await r.text());return r.json()};
const task=await j("/api/tasks",{method:"POST",body:JSON.stringify({title:"JS smoke task",description:"Update API docs",task_type:"documentation",risk_level:"low",constraints:{require_tests:true,require_behavior_preservation:false,require_human_approval:false,max_execution_seconds:300,budget_units:100}})});
const decision=await j(`/api/tasks/${task.id}/route`,{method:"POST"});
console.log({task:task.id,workflow:decision.workflow,reasons:decision.reason_codes});
