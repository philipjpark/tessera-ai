---
name: tessera-evaluate
description: Evaluate a Tessera execution independently, preserve failure evidence, and record an immutable outcome.
---

# Tessera Evaluation Skill

1. Complete the engineering attempt and identify the exact code artifact/commit being evaluated.
2. Call `evaluate_execution` with the execution ID and target path when required.
3. Read the deterministic verdict and check details.
4. If verification fails:
   - do not mark the existing execution successful;
   - preserve the failure evidence;
   - explain the failing case;
   - create a new execution for any correction attempt.
5. If verification passes, call `record_outcome` and report the observed evidence.
6. Never substitute model self-assessment for a deterministic test result.
