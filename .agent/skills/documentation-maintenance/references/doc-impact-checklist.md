# Documentation Impact Checklist

Run this checklist for any meaningful change in the repository.

## Required Questions

1. Did package setup change?
   - install requirements
   - scripts
   - build or typecheck workflow
   - published entrypoints
   - If yes, review `README.md`

2. Did frontend integration change?
   - config shape
   - bootstrap/provider registration usage
   - required environment inputs
   - If yes, review `README.md` and `docs/reference/connector-architecture.md`

3. Did Firebase integration behavior change?
   - emulator defaults
   - region behavior
   - provider token mappings
   - service responsibilities
   - If yes, review `README.md` and `docs/reference/connector-architecture.md`

4. Did architecture boundaries change?
   - ownership of Angular DI tokens
   - ownership of Firebase implementations
   - contract consumption rules
   - what is allowed in this package
   - If yes, review `docs/reference/connector-architecture.md`

5. Did documentation governance change?
   - documentation taxonomy
   - maintenance expectations
   - current source-of-truth rules
   - If yes, review `docs/README.md`

## Completion Rule

Before closing work, explicitly state one of:

- "Updated docs:" followed by the current docs changed
- "Reviewed docs, no updates needed:" followed by the reason
