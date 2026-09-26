import shutil
from pathlib import Path

from tessera_api.db import Database
from tessera_api.evaluator import run_billing_golden


def test_initial_demo_billing_has_hidden_regression(tmp_path):
    repo_root=Path(__file__).resolve().parents[3]
    original=repo_root/"examples"/"billing-service"
    isolated=tmp_path/"billing-service"
    shutil.copytree(original,isolated)
    # Use the frozen buggy baseline fixture so this test is independent of the
    # current (corrected) state of billing.py.
    buggy=(isolated/"src"/"billing_buggy_fixture.py").read_text()
    (isolated/"src"/"billing.py").write_text(buggy)
    result=run_billing_golden(isolated)
    assert not result.passed
    assert any(f["name"]=="half_cent_boundary" for f in result.details["failures"])


def test_reference_fixed_billing_passes_golden_regression(tmp_path):
    repo_root=Path(__file__).resolve().parents[3]
    original=repo_root/"examples"/"billing-service"
    copied=tmp_path/"billing-service"
    shutil.copytree(original,copied)
    fixed=(copied/"src"/"billing_reference_fixed.py").read_text()
    (copied/"src"/"billing.py").write_text(fixed)
    result=run_billing_golden(copied)
    assert result.passed
    assert result.details["failures"] == []
