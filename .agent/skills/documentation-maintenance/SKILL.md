---
name: documentation-maintenance
description: >
  Use this skill whenever work in this repository changes package setup, frontend integration,
  Firebase runtime config, provider tokens, Firebase-backed implementations, or connector
  architecture boundaries. Trigger even when the user does not explicitly mention documentation.
  The goal is to enforce documentation review and updates in the same change set as meaningful
  connector changes.
---

# Documentation Maintenance

## Goal

Treat documentation review as mandatory completion work for meaningful changes in this repository.

The agent must not assume documentation is unaffected. It must review the documentation impact,
update the current source-of-truth docs when needed, and explicitly state the result.

## Trigger Conditions

Use this skill for:

- package setup changes
- build or install changes
- frontend integration changes
- Firebase runtime config changes
- emulator behavior changes
- provider token changes
- connector export surface changes
- Firebase-backed provider implementation changes
- architecture boundary changes
- documentation governance changes

Do not skip this skill just because the request is phrased as implementation, debugging, review,
or refactor work.

## Workflow

1. Inspect the requested or actual code changes.
2. Determine whether the change affects current documentation.
3. Open the affected current docs before finalizing the work.
4. Update the affected docs in the same change set when drift exists.
5. If no doc update is needed, say that explicitly in the final response and explain why.
6. Run the doc-impact checklist in `references/doc-impact-checklist.md`.

## Documentation Routing Map

Map changes to docs as follows:

- `README.md`
  - package purpose
  - installation
  - build and typecheck workflow
  - frontend integration usage
  - emulator defaults
  - public export overview

- `docs/reference/connector-architecture.md`
  - ownership boundaries
  - export structure
  - config shape
  - emulator behavior
  - provider token to implementation mapping
  - what must not be added to this package

- `docs/README.md`
  - documentation taxonomy
  - maintenance expectations
  - documentation update rules

## Current Documentation Rules

- Current docs are canonical:
  - `README.md`
  - `docs/reference/*`

Do not leave current truth only in plans, chat output, or migration notes.

## Architecture Rule To Preserve

This repository is the Firebase connector layer of the split architecture.

- It owns Angular DI tokens and provider registration helpers.
- It owns Firebase SDK integration for the frontend.
- It implements shared contracts from `sport-club-manager-contracts`.
- It must not absorb frontend feature code.
- It must not absorb backend deploy or Cloud Functions ownership.

If the code still has a deliberate constraint, document it honestly. Do not describe the package
as frontend-agnostic or backend-owning when it is neither.

## Final Response Requirement

For relevant implementation tasks, the final response must include one of:

- which docs were updated, or
- that docs were reviewed and no update was needed, with a short reason

Lack of a documentation impact statement means the task is not complete.

## Anti-Patterns

- Changing integration config without updating setup docs
- Changing provider token ownership without updating architecture docs
- Leaving emulator behavior implicit
- Moving feature logic into the connector package
- Leaving important connector rules only in migration plans instead of current docs
