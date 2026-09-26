"""Billing service utilities for calculating and formatting invoice totals."""


def total_with_tax(subtotal: str, tax_rate: str) -> str:
    subtotal_f = float(subtotal)
    tax_f = float(tax_rate)
    total = subtotal_f * (1.0 + tax_f)
    return f"{round(total, 2):.2f}"
