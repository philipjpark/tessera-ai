"""Billing service utilities for calculating and formatting invoice totals."""

from decimal import Decimal, ROUND_HALF_UP


def total_with_tax(subtotal: str, tax_rate: str) -> str:
    subtotal_f = float(subtotal)
    tax_f = float(tax_rate)
    total = subtotal_f * (1.0 + tax_f)
    return str(Decimal(str(total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
