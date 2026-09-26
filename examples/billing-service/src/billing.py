"""Billing implementation with normalized currency output formatting.

Uses Decimal arithmetic and ROUND_HALF_UP to avoid binary float rounding
errors and produce consistent half-cent boundary behavior.
"""
from decimal import Decimal, ROUND_HALF_UP

_CENT = Decimal("0.01")


def total_with_tax(subtotal: str, tax_rate: str) -> str:
    subtotal_d = Decimal(subtotal)
    tax_d = Decimal(tax_rate)
    total = subtotal_d * (Decimal("1") + tax_d)
    return format(total.quantize(_CENT, rounding=ROUND_HALF_UP), "f")
