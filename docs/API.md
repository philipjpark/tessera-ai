# API quick reference

## Health
`GET /health`

## Tasks
- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/tasks/{task_id}`
- `POST /api/tasks/{task_id}/route`
- `GET /api/tasks/{task_id}/history`
- `GET /api/tasks/{task_id}/route-history`

## Executions
- `POST /api/executions`
- `POST /api/executions/{execution_id}/complete`
- `POST /api/executions/{execution_id}/evaluate`
- `POST /api/executions/{execution_id}/record-outcome`

## Optimization
- `POST /api/optimization/compare`

The optimization endpoint always runs the exact baseline. If `run_qaoa=true`, it also attempts the isolated `integrations/qiskit/run_qaoa.py` adapter. Qiskit failure is reported in the comparison and does not remove the exact result.
