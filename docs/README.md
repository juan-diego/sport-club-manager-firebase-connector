# Documentation Index

This repository holds the current source-of-truth documentation for the Firebase connector
package.

## Current Documentation

### Reference

- [reference/connector-architecture.md](reference/connector-architecture.md)
  - Status: `Current`
  - Use for package ownership boundaries, exported integration entrypoints, emulator behavior, and
    the mapping between shared contracts and Firebase-backed implementations.

## Conventions

- `README.md` is for package purpose, install/build commands, frontend integration, and public API
  orientation.
- `docs/reference/*` is for architecture boundaries, exported connector behavior, and maintenance
  rules.
- If config shape, provider tokens, Firebase integration behavior, or package boundaries change,
  update `README.md` and `docs/reference/connector-architecture.md` in the same change set.
