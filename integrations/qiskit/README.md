# Qiskit integration

This integration is an optional heterogeneous-compute backend for Tessera's **batch workflow allocation** problem. It is intentionally not on the API startup path and never overrides hard policy constraints.

## Contract

Input is a JSON object matching Tessera's `OptimizationRequest`. The adapter builds a Qiskit `QuadraticProgram`, runs QAOA with a local `StatevectorSampler`, decodes the selected task/workflow variables, and returns JSON. Tessera validates that candidate with the same eligibility/budget rules used for the exact classical solver.

The exact solver is the V1 reference. QAOA is an experiment and may be slower or return a worse/invalid candidate. That is an acceptable empirical result.

## Run standalone

```bash
pip install -r integrations/qiskit/requirements.txt
python integrations/qiskit/run_qaoa.py < integrations/qiskit/example_request.json
```

## Why isolate this integration?

- Qiskit remains optional.
- API startup cannot fail because quantum dependencies are absent.
- The interface can later point to simulator, Runtime primitives, or other solvers without contaminating core routing logic.
- Classical and QAOA runs consume the exact same normalized problem definition.
