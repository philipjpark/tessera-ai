from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from .models import CheckResult, Evaluation, utc_now
from .repository import Repository, new_id


class EvaluationError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(65536),b""):
            h.update(chunk)
    return h.hexdigest()


def _load_billing_module(path: Path):
    spec=importlib.util.spec_from_file_location("tessera_demo_billing", path)
    if spec is None or spec.loader is None:
        raise EvaluationError(f"Cannot load billing implementation: {path}")
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def run_billing_golden(service_path: Path) -> CheckResult:
    impl=service_path/"src"/"billing.py"; fixtures=service_path/"golden_cases.json"
    if not impl.exists() or not fixtures.exists():
        raise EvaluationError("Billing service or golden fixtures missing")
    module=_load_billing_module(impl)
    cases=json.loads(fixtures.read_text())
    failures=[]
    for c in cases:
        actual=str(module.total_with_tax(c["subtotal"], c["tax_rate"]))
        if actual != c["expected"]:
            failures.append({"name":c["name"],"expected":c["expected"],"actual":actual})
    return CheckResult(name="golden_regression",passed=not failures,details={"case_count":len(cases),"failures":failures})


def run_unit_tests(service_path: Path) -> CheckResult:
    proc=subprocess.run([sys.executable,"-m","pytest","-q",str(service_path/"tests"/"test_basic.py")],cwd=service_path,capture_output=True,text=True,timeout=30)
    return CheckResult(name="unit_tests",passed=proc.returncode==0,details={"returncode":proc.returncode,"stdout":proc.stdout[-4000:],"stderr":proc.stderr[-2000:]})


def evaluate_billing(repo: Repository, execution_id: str, service_path: Path) -> Evaluation:
    execution=repo.get_execution(execution_id)
    if not execution:
        raise KeyError(execution_id)
    checks=[run_unit_tests(service_path),run_billing_golden(service_path)]
    impl=service_path/"src"/"billing.py"
    artifact_id=repo.save_artifact(execution_id,"source_snapshot",sha256_file(impl),str(impl))
    verdict="passed" if all(c.passed for c in checks) else "failed"
    ev=Evaluation(id=new_id("evaluation"),execution_id=execution_id,verdict=verdict,checks=checks,evidence_artifact_ids=[artifact_id],evaluated_at=utc_now())
    return repo.save_evaluation(ev)
