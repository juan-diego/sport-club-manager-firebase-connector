# Connector Architecture

This document describes the intended architecture and maintenance boundaries for
`sport-club-manager-firebase-connector`.

## Role In The System

This package is the Firebase implementation layer used by the Angular frontend.

It sits between:

- `sport-club-manager-angular-frontend`
- `sport-club-manager-contracts`

It implements shared provider contracts using:

- Firebase Auth
- Cloud Firestore
- Cloud Functions callable APIs

## Ownership Boundaries

This package owns:

- Angular provider tokens for contract consumption
- Firebase runtime tokens for app, auth, Firestore, and Functions
- provider registration helpers for Angular bootstrap/config
- Firebase-backed implementations of the shared provider contracts

This package must not own:

- frontend routes, pages, templates, or feature-state logic
- shared contract definitions or shared domain model ownership
- Cloud Functions source code
- Firebase deploy configuration, secrets, or backend operations docs

## Current Export Structure

Primary entrypoints:

- root package export
- `config` subpath export
- `providers` subpath export
- `services` subpath export

Important exports:

- `provideFirebaseConnector(...)`
- `provideFirebaseProviders()`
- `FIREBASE_CONNECTOR_CONFIG`
- `FIREBASE_APP`
- `FIREBASE_AUTH`
- `FIREBASE_FIRESTORE`
- `FIREBASE_FUNCTIONS`
- provider tokens such as `AUTH_PROVIDER` and `SPACE_REGISTRATION_PROVIDER`

## Frontend Configuration Model

The connector must not import app-local environment files.

Instead, the consuming frontend supplies configuration through `provideFirebaseConnector(...)`.

Current config fields:

- `firebaseConfig`
- `production`
- optional `functionsRegion`
- optional `emulators`

This boundary is intentional. It keeps environment ownership in the frontend while keeping all
Firebase SDK integration logic inside the connector package.

## Emulator Behavior

When `production === false`, the connector enables emulator connections.

Default endpoints:

- Auth: `http://127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`
- Functions: `127.0.0.1:5001`

Consumers may override these values through the `emulators` config object.

## Contract To Implementation Mapping

Current provider token mappings:

- `AUTH_PROVIDER` -> `FirebaseAuthService`
- `CLUB_SETTINGS_PROVIDER` -> `FirebaseClubSettingsService`
- `USER_DETAIL_PROVIDER` -> `FirebaseUsersService`
- `REGISTRATION_PROVIDER` -> `FirebaseRegistrationFunctionsService`
- `ROLE_PROVIDER` -> `FirebaseRoleFunctionsService`
- `FEDERATION_PROVIDER` -> `FirebaseFederationsService`
- `SPACE_PROVIDER` -> `FirebaseSpacesService`
- `SPACE_REGISTRATION_PROVIDER` -> `FirebaseRegistrationFunctionsService`

## Firebase Responsibility Split

Current implementation responsibilities:

- Auth state and claims hydration
  - `FirebaseAuthService`
- Club runtime settings read/update
  - `FirebaseClubSettingsService`
- Federations catalog reads and callable mutations
  - `FirebaseFederationsService`
- Invitations, registration completion, and space registration callables
  - `FirebaseRegistrationFunctionsService`
- Role-related callable Functions
  - `FirebaseRoleFunctionsService`
- Direct spaces collection access
  - `FirebaseSpacesService`
- User read models and user-related callable updates
  - `FirebaseUsersService`

## Change Rules

When changing this package, verify all of the following:

- shared contracts are imported from `sport-club-manager-contracts`
- no frontend feature code is introduced
- no backend deploy/runtime ownership leaks into the package
- config and emulator behavior remain documented
- exported Angular integration entrypoints remain intentional and documented

## Known Deliberate Limitation

This package is Angular-specific by design because it owns Angular `InjectionToken` definitions
and provider registration helpers. That is expected and should be documented honestly rather than
treated as accidental coupling.
