"""Intentionally imperfect billing implementation for Tessera's demo.

The bug is realistic: financial values are converted to binary floats and Python's
rounding behavior does not implement the desired ROUND_HALF_UP decimal rule.
Standard tests miss the half-cent boundary; Tessera's frozen golden fixtures catch it.
"""


def total_with_tax(subtotal: str, tax_rate: str) -> str:
    subtotal_f = float(subtotal)
    tax_f = float(tax_rate)
    total = subtotal_f * (1.0 + tax_f)
    return f"{round(total, 2):.2f}"
