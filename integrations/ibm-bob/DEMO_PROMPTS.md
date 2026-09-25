# Bob demo prompts

Use these as starting prompts, not canned transcripts. The Bob tool calls and code edits should be real during the recording.

## Prompt 1 — understand the repo

> Inspect this repository in Ask/Plan mode. Read README.md, docs/ARCHITECTURE.md, `.bob/`, the Tessera API routing/evaluator code, and the sample billing service. Explain the Task -> Route -> Execute -> Verify -> Outcome loop. Do not modify files.

## Prompt 2 — first low-risk task

> Use the Tessera workflow. The task is: **"Normalize the billing service's currency output formatting while keeping the change targeted."** Treat this as low risk, task type `formatting_fix`, sensitive area `billing_formatting`, tests required, no mandatory behavior-preservation flag and no mandatory human-approval flag. First call Tessera to profile the task and select the production workflow. Register the execution before editing. Follow the selected workflow, modify only what is necessary, run ordinary tests, then call Tessera's independent evaluator. Do not declare success unless Tessera passes it. If Tessera fails the attempt, preserve that failure and stop so we can inspect the evidence.

Expected product behavior before any relevant history: `FAST` is eligible and normally selected.

## Prompt 3 — comparable task after failure

> Create a second comparable low-risk billing-formatting task. Use the same task type and sensitive area. Ask Tessera to profile and route it **without forcing a workflow**. Explain whether prior evidence changed the decision. If the route is ASSURANCE because of `PRIOR_FAST_FAILURE`, use an Explore subagent to inspect the billing implementation and frozen regression evidence before modifying code. Register a new execution, implement the correction, run normal tests, ask Tessera to independently evaluate, and record the outcome if verification passes.

## Recording checkpoint

During the video, show at least one live MCP call and the UI evidence for:

- first production route = FAST
- frozen regression expected vs actual failure
- persisted failed outcome
- second production route = ASSURANCE
- reason code `PRIOR_FAST_FAILURE`
- corrected execution = independently verified
