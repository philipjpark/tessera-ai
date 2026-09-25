SHELL := /bin/bash

.PHONY: api web router mcp test test-python typecheck demo qiskit clean

api:
	cd services/api && uvicorn tessera_api.main:app --reload --port 8000

web:
	cd apps/web && npm run dev

router:
	cargo build --manifest-path crates/router/Cargo.toml

mcp:
	cd integrations/ibm-bob/mcp-server && npm run dev

test-python:
	cd services/api && pytest -q

test:
	cd services/api && pytest -q
	@if command -v cargo >/dev/null 2>&1; then cargo test --manifest-path crates/router/Cargo.toml; else echo "cargo not installed; skipping Rust tests"; fi

typecheck:
	npm run typecheck

demo:
	cd services/api && python -m tessera_api.demo

qiskit:
	python integrations/qiskit/run_qaoa.py < integrations/qiskit/example_request.json

clean:
	rm -rf services/api/.pytest_cache services/api/**/__pycache__ crates/router/target apps/web/.next integrations/ibm-bob/mcp-server/dist
