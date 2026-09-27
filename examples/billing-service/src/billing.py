"""Isolated buggy baseline fixture for test_initial_demo_billing_has_hidden_regression.

This preserves the original float + banker's-rounding implementation that was present
before the ASSURANCE fix. It exists solely so the test can construct an isolated
temporary service directory that deterministically fails the half_cent_boundary
golden case, independent of the current (corrected) state of billing.py.

The bug: Python's built-in round() uses banker's rounding (round half to even),
so round(1.005, 2) returns 1.0 instead of 1.01.  Standard tests miss this;
Tessera's frozen golden fixtures catch it.

Do NOT import or execute this module in production code.
"""


def total_with_tax(subtotal: str, tax_rate: str) -> str:
    subtotal_f = float(subtotal)
    tax_f = float(tax_rate)
    total = subtotal_f * (1.0 + tax_f)
    return f"{round(total, 2):.2f}"
