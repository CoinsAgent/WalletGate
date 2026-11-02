
## Default Development Workflow

Use the approved Product Contract doc/PRODUCT_UNDERSTANDING_CONTRACT.md doc/PRODUCT_VALUE_PROPOSITION.md
docs/PRODUCT_MAP.md as persistent project context.

Automatically select the appropriate skill
based on the user's intent and repository state.

### What's next?

1. Read the current Product Map and Sprint state.
2. If the Product Map is missing or needs strategic
   revision, use the product-map skill.
3. If a critical decision blocks the next Story,
   explain the blocker and recommend a resolution.
4. If a Sprint is unfinished, identify the next
   required action without restarting it.
5. Otherwise, recommend the highest-value READY
   User Story and use story-sprint skill for planning.
6. Explain the recommendation concisely.
7. Never automatically execute code changes.

### Implement

Use story-sprint.

Require a specific, current, approved Sprint plan
and explicit execution authorization.
If either is missing, request approval first.

### Review

Use story-sprint.

Verify the actual end-to-end acceptance,
preserve evidence, and update Story status
only when acceptance is justified.

### General Rules

- One Sprint = one primary User Story.
- Do not regenerate approved product definitions.
- Resume unfinished work instead of duplicating it.
- Never invent approval for product decisions.
- Never start the next Sprint automatically.
- Do not commit, push, or deploy without authorization.
