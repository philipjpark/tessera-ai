# Billing Service Demo Target

This tiny service exists to make the Tessera demonstration deterministic.

- `src/billing.py` is intentionally flawed.
- `tests/test_basic.py` represents the ordinary project test suite and passes.
- `golden_cases.json` is the independent frozen regression suite and exposes `half_cent_boundary`.
- `src/billing_reference_fixed.py` is a maintainer reference; do not point Bob to it during the live demo if you want Bob to solve the bug independently.

The intended correction is to use decimal arithmetic with an explicit financial rounding rule rather than binary floating-point rounding.
