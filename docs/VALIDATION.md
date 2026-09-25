# Validation status at handoff

Validated in the generation environment:

- Python control-plane tests: **8 passed**.
- Python modules and the Qiskit adapter source compile successfully.
- Demo script produces: first production `FAST`, persisted failure, comparable next `ASSURANCE` with `PRIOR_FAST_FAILURE`.
- JSON configuration files parse successfully.

Not fully validated in this environment:

- Rust crate: Cargo/Rust toolchain was not installed. Run `cargo test --manifest-path crates/router/Cargo.toml` locally.
- TypeScript workspaces: dependency installation timed out in the generation environment. Run `npm install && npm run typecheck` locally.
- Qiskit runtime: Qiskit packages were not installed. Install `integrations/qiskit/requirements.txt` and run the standalone adapter.
- Live IBM Bob connectivity: requires the event-provisioned Bob account/IDE. Build the MCP server and validate project MCP discovery during the hackathon.

Do not convert these unvalidated items into claims until they are verified locally.
