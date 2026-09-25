use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel { Low, Medium, High }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Constraints {
    #[serde(default)] pub require_tests: bool,
    #[serde(default)] pub require_behavior_preservation: bool,
    #[serde(default)] pub require_human_approval: bool,
    pub max_execution_seconds: Option<u64>,
    pub budget_units: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub domain: String,
    pub task_type: String,
    pub risk_level: RiskLevel,
    pub sensitive_area: Option<String>,
    pub constraints: Constraints,
    pub repository_path: Option<String>,
    pub status: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteInput {
    pub task: Task,
    #[serde(default)] pub prior_failed_workflows: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum Workflow { FAST, INVESTIGATE, ASSURANCE }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteOutput {
    pub workflow: Workflow,
    pub reason_codes: Vec<String>,
    pub candidate_scores: BTreeMap<String, Option<f64>>,
    pub rationale: String,
}

fn sensitive(area: Option<&str>) -> bool {
    matches!(area, Some("financial_logic" | "auth" | "security" | "payments" | "permissions" | "database_migration" | "infrastructure"))
}

pub fn route(input: &RouteInput) -> RouteOutput {
    let t=&input.task;
    let mut reasons=Vec::new();
    let mut scores=BTreeMap::from([
        ("FAST".into(),Some(10.0)),
        ("INVESTIGATE".into(),Some(24.0)),
        ("ASSURANCE".into(),Some(42.0)),
    ]);

    match t.risk_level {
        RiskLevel::High => { reasons.push("HIGH_RISK".into()); scores.insert("FAST".into(),None); scores.insert("ASSURANCE".into(),Some(12.0)); }
        RiskLevel::Medium => { reasons.push("MEDIUM_RISK".into()); scores.insert("FAST".into(),Some(30.0)); scores.insert("INVESTIGATE".into(),Some(16.0)); }
        RiskLevel::Low => {}
    }
    if sensitive(t.sensitive_area.as_deref()) {
        reasons.push("SENSITIVE_AREA".into()); scores.insert("FAST".into(),None); scores.insert("ASSURANCE".into(),Some(11.0));
    }
    if t.constraints.require_behavior_preservation {
        reasons.push("BEHAVIOR_PRESERVATION_REQUIRED".into()); scores.insert("FAST".into(),None); scores.insert("ASSURANCE".into(),Some(8.0));
    }
    if t.constraints.require_human_approval {
        reasons.push("HUMAN_APPROVAL_REQUIRED".into()); scores.insert("FAST".into(),None); scores.insert("ASSURANCE".into(),Some(9.0));
    }
    if input.prior_failed_workflows.iter().any(|w| w=="FAST") {
        reasons.push("PRIOR_FAST_FAILURE".into()); scores.insert("FAST".into(),None); scores.insert("ASSURANCE".into(),Some(7.0));
    }
    if matches!(t.task_type.as_str(),"investigation"|"concurrency_bug"|"architecture") && scores.get("FAST").and_then(|x|*x).is_some() {
        reasons.push("REPOSITORY_CONTEXT_REQUIRED".into()); scores.insert("FAST".into(),Some(35.0)); scores.insert("INVESTIGATE".into(),Some(10.0));
    }
    if reasons.is_empty() { reasons.push("LOW_RISK_TARGETED_CHANGE".into()); }

    let candidates=[Workflow::FAST,Workflow::INVESTIGATE,Workflow::ASSURANCE];
    let workflow=candidates.into_iter().filter_map(|w| {
        let key=match w {Workflow::FAST=>"FAST",Workflow::INVESTIGATE=>"INVESTIGATE",Workflow::ASSURANCE=>"ASSURANCE"};
        scores.get(key).copied().flatten().map(|s|(w,s))
    }).min_by(|a,b|a.1.partial_cmp(&b.1).unwrap()).unwrap().0;
    let rationale=match workflow {
        Workflow::FAST=>"Low-risk targeted work can use the minimal verified workflow.",
        Workflow::INVESTIGATE=>"The task needs repository investigation before implementation.",
        Workflow::ASSURANCE=>"Risk, behavior-preservation, approval, or prior-failure evidence requires independent assurance.",
    }.to_string();
    RouteOutput{workflow,reason_codes:reasons,candidate_scores:scores,rationale}
}

#[cfg(test)]
mod tests {
    use super::*;
    fn base()->Task { Task{id:"t".into(),title:"x".into(),description:"x".into(),domain:"software_engineering".into(),task_type:"bug_fix".into(),risk_level:RiskLevel::Low,sensitive_area:None,constraints:Constraints{require_tests:true,require_behavior_preservation:false,require_human_approval:false,max_execution_seconds:Some(300),budget_units:Some(100.0)},repository_path:None,status:None,created_at:None} }

    #[test]
    fn low_risk_is_fast(){ let out=route(&RouteInput{task:base(),prior_failed_workflows:vec![]}); assert_eq!(out.workflow,Workflow::FAST); }
    #[test]
    fn behavior_preservation_is_assurance(){ let mut t=base(); t.constraints.require_behavior_preservation=true; let out=route(&RouteInput{task:t,prior_failed_workflows:vec![]}); assert_eq!(out.workflow,Workflow::ASSURANCE); }
    #[test]
    fn prior_fast_failure_escalates(){ let out=route(&RouteInput{task:base(),prior_failed_workflows:vec!["FAST".into()]}); assert_eq!(out.workflow,Workflow::ASSURANCE); assert!(out.reason_codes.contains(&"PRIOR_FAST_FAILURE".into())); }
}
