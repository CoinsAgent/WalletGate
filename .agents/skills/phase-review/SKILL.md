---
name: phase-review
description: Review a completed WalletGate phase and, when explicitly invoked, commit and push its scoped delivery with the phase's main aim as the commit subject. Report in chat without generating files.
---

# Phase review, commit and push

An explicit user invocation of `$phase-review` authorizes review and, after a passing review, committing and pushing the selected phase. Do not request another routine confirmation. Creating, editing, discovering or implicitly selecting this skill does not authorize publication. Honor a review-only request. This is a separate post-execution workflow; `$phase-plan-exec` still prohibits commits and pushes during execution.

## Review

- Use the user's selected phase, otherwise the phase in `docs/PLANS.md`. Read its scope, all Tasks, acceptance criteria, existing progress/Handoff and relevant Product Contract sections. Do not run the planner, alter phase status or start another phase.
- Inspect Git status, staged/unstaged diffs, untracked files, history, branch, upstream and remotes. Identify phase-owned changes and any existing unpushed phase commits. If already committed, review those commits instead of creating an empty or duplicate commit.
- Review actual code and tests against every in-scope Task and acceptance criterion. Check regressions, security/identity boundaries, accidental secrets and unrelated changes. READY_FOR_REVIEW and saved evidence do not prove current correctness. Preserve approved scope limits and unresolved decisions; do not invent product policies.
- Validate existing evidence against current artifacts where applicable. Run appropriate checks only with file output, caches and coverage disabled, showing results directly. Do not install dependencies, migrate databases or start services that persist data. If a required check necessarily generates files, report the gap and stop before publishing unless adequate current evidence already exists. Distinguish executed checks, historical evidence, source inspection and unknowns.
- Report consequential findings in chat with severity and file/line references. Blocking defects, incomplete Tasks, failed required checks, stale acceptance evidence and unresolved in-scope product/security decisions prevent publication. Stop and describe the correction; do not fix code as part of this review.

## Publish after a passing review

- Stage only reviewed phase changes using explicit paths or scoped hunks. Preserve unrelated staged/unstaged work and exclude it from the commit; never use blanket staging. If staged work cannot safely be separated, stop and explain. Exclude secrets, caches and unrelated artifacts. Generated assessment reports require separate explicit commit authorization under `AGENTS.md`.
- Use the phase's main aim as a concise action/outcome commit subject, optionally followed by its ID: `Publish issuer discovery and verify a standard RP flow (PH-004)`. Do not lead with a generic `Phase review` title or a task list. Any optional body must describe reviewed delivery and actual verification.
- Inspect the final staged diff, run `git diff --cached --check`, and ensure reviewed content has not changed. Commit with inline message arguments, without creating a message file. Honor hooks without bypassing failures. If a known hook generates files, stop before invoking it and explain the conflict with the no-generated-files requirement.
- Push to the current branch's configured upstream. Without an upstream, use an unambiguous existing project remote and current branch name, setting the upstream. Ask only if the destination is genuinely ambiguous. Review the entire outgoing range to avoid publishing unrelated commits under phase authorization.
- Do not force-push, amend published history, reset, deploy, merge or automatically rebase. On push rejection, stop and preserve the local commit. For network/permission failures, follow the environment's approval mechanism.
- Verify the push result and remote branch tip. Report phase, main aim, review/check results, commit hash and destination. If publication fails, state which steps succeeded and what remains.

## No generated files

Keep findings and the final result in chat. Do not create or modify reports, logs, plans, progress, Coverage, temporary files, scripts or other review artifacts. Read existing evidence without invoking an assessment publisher. Only Git index/object/ref updates necessary for the authorized commit and push are expected writes. Never delete or rewrite user files to make the worktree clean.
