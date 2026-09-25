# Hackathon submission checklist

## Core technical proof

- [ ] Bob project MCP server connects successfully.
- [ ] `profile_task` works live from Bob.
- [ ] `select_workflow` works live from Bob.
- [ ] First low-risk comparable task selects FAST under production policy.
- [ ] Bob edits the target project.
- [ ] Ordinary tests pass while frozen regression fails.
- [ ] Failed execution is persisted and visible in UI.
- [ ] Second comparable task selects ASSURANCE because of `PRIOR_FAST_FAILURE`.
- [ ] Bob uses an Explore subagent during ASSURANCE investigation.
- [ ] Corrected execution passes independent verification.

## Impact proof

- [ ] Run fixed-FAST baseline on a small task set.
- [ ] Run fixed-ASSURANCE baseline on the same family where practical.
- [ ] Run Tessera policy.
- [ ] Record only measured time/retries/failures/interventions.

## Competition evidence

- [ ] `bob_sessions/` contains Bob task session-summary screenshots.
- [ ] 4–5 minute video recorded.
- [ ] slides exported.
- [ ] hosted demo/API links work if required.
- [ ] repository README has clean setup instructions.
- [ ] limitations are stated honestly.

## Optional

- [ ] Qiskit adapter installed.
- [ ] exact classical and QAOA solve the same problem definition.
- [ ] QAOA candidate is independently validated.
