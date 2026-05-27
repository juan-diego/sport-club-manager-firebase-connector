# sport-club-manager-firebase-connector

Firebase connector package for the Sport Club Manager Angular frontend.

This package owns the Angular and Firebase integration layer that implements the shared contracts
from `sport-club-manager-contracts`.

## Purpose

This repository owns:

- Angular `InjectionToken` definitions for provider consumption
- Firebase app, auth, Firestore, and Functions integration
- Firebase-backed implementations of the shared contracts
- package-level setup and reference documentation

This repository does not own:

- Angular feature pages, routes, or UI components
- application business services outside the provider connector layer
- shared contract definitions
- Firebase Cloud Functions source code or deploy assets

## Dependencies

Required peer dependencies:

- `@angular/core`
- `firebase`
- `rxjs`
- `sport-club-manager-contracts`

Planned consumer:

- `sport-club-manager-angular-frontend`

For local development in the split workspace, this repository expects
`sport-club-manager-contracts` to exist as a sibling repository and resolves it through a local
`file:` dev dependency.

## Package Layout

- `src/config`
  - Firebase configuration contracts and runtime tokens
- `src/providers`
  - Angular provider tokens and registration helpers
- `src/services`
  - Firebase-backed implementations of the shared provider contracts

Published entrypoints:

- `sport-club-manager-firebase-connector`
- `sport-club-manager-firebase-connector/config`
- `sport-club-manager-firebase-connector/providers`
- `sport-club-manager-firebase-connector/services`

## Frontend Integration

The frontend should configure this package through `provideFirebaseConnector(...)`.

Expected config shape:

- `firebaseConfig`
  - Firebase web app configuration object
- `production`
  - boolean flag controlling emulator usage
- `functionsRegion`
  - optional override for callable Functions region
- `emulators`
  - optional override for local emulator endpoints

Example:

```ts
import { provideFirebaseConnector } from 'sport-club-manager-firebase-connector';

provideFirebaseConnector({
  firebaseConfig: environment.firebaseConfig,
  production: environment.production,
  functionsRegion: 'europe-southwest1'
});
```

## Default Emulator Behavior

When `production === false`, the connector uses these defaults unless overridden:

- Auth: `http://127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`
- Functions: `127.0.0.1:5001`

## Exported Integration Surface

Main exports include:

- `provideFirebaseConnector(...)`
- `provideFirebaseProviders()`
- provider tokens such as `AUTH_PROVIDER` and `ROLE_PROVIDER`
- Firebase runtime tokens such as `FIREBASE_AUTH`, `FIREBASE_FIRESTORE`, and `FIREBASE_FUNCTIONS`
- Firebase-backed service implementations

## Build And Validation

Common commands:

```bash
npm run typecheck
npm run build
npm run check:angular-metadata
```

This package must be built with Angular compilation. Do not replace the build with plain `tsc` for
Angular-decorated classes, or consuming apps can fail at runtime with JIT compilation errors.

## Boundary Rules

- Keep all frontend Firebase SDK usage in this package.
- Do not move shared contracts into this package.
- Do not add application route, screen, or feature logic here.
- Do not add Cloud Functions or backend deploy concerns here.

## Documentation

- [docs/README.md](docs/README.md)
- [docs/reference/connector-architecture.md](docs/reference/connector-architecture.md)
