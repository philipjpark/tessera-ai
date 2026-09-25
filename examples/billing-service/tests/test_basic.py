from pathlib import Path
import importlib.util

MODULE_PATH = Path(__file__).parents[1] / "src" / "billing.py"
spec = importlib.util.spec_from_file_location("billing", MODULE_PATH)
billing = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(billing)


def test_zero():
    assert billing.total_with_tax("0.00", "0.08875") == "0.00"


def test_normal_purchase():
    assert billing.total_with_tax("100.00", "0.05") == "105.00"


def test_simple_decimal():
    assert billing.total_with_tax("10.00", "0.10") == "11.00"
