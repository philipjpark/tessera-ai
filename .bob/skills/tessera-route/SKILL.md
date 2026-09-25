---
name: tessera-route
description: Profile an engineering task with Tessera, select an approved execution workflow, and follow its constraints before modifying code.
---

# Tessera Route Skill

1. Summarize the user's engineering objective in one sentence.
2. Call `profile_task` with the title, description, task type, risk, sensitive area, and explicit constraints.
3. Call `select_workflow` for the returned task ID.
4. Read the reason codes and workflow requirements.
5. If the route is `FAST`, make only the targeted change and run standard validation.
6. If the route is `INVESTIGATE`, first inspect the relevant repository area. Prefer an `explore` subagent when the investigation is self-contained and large enough to benefit from isolated context.
7. If the route is `ASSURANCE`, investigate before editing, preserve existing behavioral fixtures, run independent Tessera evaluation after implementation, and do not merge/claim success until verification passes.
8. Call `begin_execution` before substantive edits so the attempt has an immutable execution record.
9. Never override a hard-ineligible production workflow merely to make a demo narrative work. Controlled experiments must be explicitly labeled and kept outside the golden-path causality claim.
