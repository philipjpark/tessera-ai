"""Reference approach for maintainers; the live demo target is billing.py.

Bob should independently arrive at an equivalent Decimal-based implementation.
"""
from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")


def total_with_tax(subtotal: str, tax_rate: str) -> str:
    subtotal_d = Decimal(subtotal)
    tax_d = Decimal(tax_rate)
    total = subtotal_d * (Decimal("1") + tax_d)
    return format(total.quantize(CENT, rounding=ROUND_HALF_UP), "f")
