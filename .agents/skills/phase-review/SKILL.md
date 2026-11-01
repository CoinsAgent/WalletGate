---
name: phase-review
description: Review a WalletGate sprint's single vertical slice and end-to-end acceptance and, when explicitly invoked, commit and push its scoped delivery. Report in chat without generating files.
---

# Phase review, commit and push

An explicit user invocation of `$phase-review` authorizes review and, after a passing review, committing and pushing the selected phase. Do not request another routine confirmation. Creating, editing, discovering or implicitly selecting this skill does not authorize publication. Honor a review-only request. This is a separate post-execution workflow; `$phase-plan-exec` still prohibits commits and pushes during execution.

## Review

- Use the user's selected phase, otherwise the phase in `docs/PLANS.md`. Read its scope, all Tasks, acceptance criteria, existing progress/Handoff and relevant Product Contract sections. Do not run the planner, alter phase status or start another phase.
- Read `docs/deferred/`. Verify that current explicitly deferred cases have durable directory records and that the reviewed slice did not silently reactivate them as its main aim or supporting work. Reopening requires an explicit user request for that case/behavior and the sprint's normal execution approval. Deferred checks remain unverified. Preserve historical records/receipts; do not create, migrate or edit deferral files during this review. For legacy completed scopes, distinguish later directory consolidation from evidence available at their original completion.
- Inspect Git status, staged/unstaged diffs, untracked files, history, branch, upstream and remotes. Identify phase-owned changes and any existing unpushed phase commits. If already committed, review those commits instead of creating an empty or duplicate commit.
- Review actual code and tests against every in-scope Task and acceptance criterion. Check regressions, security/identity boundaries, accidental secrets and unrelated changes. READY_FOR_REVIEW and saved evidence do not prove current correctness. Preserve approved scope limits and unresolved decisions; do not invent product policies.
- Apply the three sprint rules: **One Sprint = One Vertical Slice**, **End-to-End Acceptance**, and **No Layer-Only Delivery**. Trace the approved actor/trigger through the production path to its observable terminal result and relevant denial/recovery outcomes. Verify that all supporting Tasks deliver this same slice and that integration evidence covers the real boundaries, not only isolated layers or mocked components. Incomplete defining integration or acceptance blocks publication of a product-delivery claim. Respect approved fixture/device limits and explicit deferrals; never claim unexecuted checks passed. Do not retroactively invalidate legacy research records or silently expand an existing approved scope.
- Temporary phase evidence belongs in `evidence/<phase-id>/` and is removed by the execution controller when the phase becomes READY_FOR_REVIEW. Read the retained progress/Handoff and `sprint-completion` receipt; deleted logs are intentionally unavailable, not a reason by themselves to reject completion. A receipt records prior validation, not current correctness. Validate retained source/test hashes and record any verification limits. Do not recreate or delete evidence during this review.
- Validate existing evidence against current artifacts where applicable. Run appropriate checks only with file output, caches and coverage disabled, showing results directly. Do not install dependencies, migrate databases or start services that persist data. If a required check necessarily generates files, report the gap and stop before publishing unless adequate current evidence already exists. Distinguish executed checks, historical evidence, source inspection and unknowns.
- Report consequential findings in chat with severity and file/line references. Blocking defects, incomplete Tasks, failed required checks, changed completion records or stale retained acceptance artifacts and unresolved in-scope product/security decisions prevent publication. Stop and describe the correction; do not fix code as part of this review.

## Publish after a passing review

- Stage only reviewed phase changes using explicit paths or scoped hunks. Preserve unrelated staged/unstaged work and exclude it from the commit; never use blanket staging. If staged work cannot safely be separated, stop and explain. Exclude secrets, caches, `evidence/` and unrelated artifacts. Generated assessment reports require separate explicit commit authorization under `AGENTS.md`.
- Use the phase's main aim as a concise action/outcome commit subject, optionally followed by its ID: `Publish issuer discovery and verify a standard RP flow (PH-004)`. Do not lead with a generic `Phase review` title or a task list. Any optional body must describe reviewed delivery and actual verification.
- Inspect the final staged diff, run `git diff --cached --check`, and ensure reviewed content has not changed. Commit with inline message arguments, without creating a message file. Honor hooks without bypassing failures. If a known hook generates files, stop before invoking it and explain the conflict with the no-generated-files requirement.
- Push to the current branch's configured upstream. Without an upstream, use an unambiguous existing project remote and current branch name, setting the upstream. Ask only if the destination is genuinely ambiguous. Review the entire outgoing range to avoid publishing unrelated commits under phase authorization.
- Do not force-push, amend published history, reset, deploy, merge or automatically rebase. On push rejection, stop and preserve the local commit. For network/permission failures, follow the environment's approval mechanism.
- Verify the push result and remote branch tip. Report phase, main aim, review/check results, commit hash and destination. If publication fails, state which steps succeeded and what remains.

## No generated files

Keep findings and the final result in chat. Do not create or modify reports, logs, plans, progress, Coverage, temporary files, scripts or other review artifacts. Read existing evidence without invoking an assessment publisher. Only Git index/object/ref updates necessary for the authorized commit and push are expected writes. Never delete or rewrite user files to make the worktree clean.
