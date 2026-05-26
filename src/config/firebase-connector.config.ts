import { inject, InjectionToken } from '@angular/core';

import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getApp, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

export interface FirebaseConnectorEmulatorConfig {
  authUrl?: string;
  firestoreHost?: string;
  firestorePort?: number;
  functionsHost?: string;
  functionsPort?: number;
}

export interface FirebaseConnectorConfig {
  firebaseConfig: FirebaseOptions;
  production: boolean;
  functionsRegion?: string;
  emulators?: FirebaseConnectorEmulatorConfig;
}

const DEFAULT_FUNCTIONS_REGION = 'europe-southwest1';
const DEFAULT_EMULATORS: Required<FirebaseConnectorEmulatorConfig> = {
  authUrl: 'http://127.0.0.1:9099',
  firestoreHost: '127.0.0.1',
  firestorePort: 8080,
  functionsHost: '127.0.0.1',
  functionsPort: 5001
};

export const FIREBASE_CONNECTOR_CONFIG = new InjectionToken<FirebaseConnectorConfig>(
  'Sport Club Manager Firebase connector config'
);

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('Firebase App', {
  providedIn: 'root',
  factory: () => {
    const config = inject(FIREBASE_CONNECTOR_CONFIG);

    try {
      return getApp();
    } catch {
      return initializeApp(config.firebaseConfig);
    }
  }
});

export const FIREBASE_AUTH = new InjectionToken<Auth>('Firebase Auth', {
  providedIn: 'root',
  factory: () => {
    const auth = getAuth(inject(FIREBASE_APP));
    const config = inject(FIREBASE_CONNECTOR_CONFIG);

    if (config.production === false) {
      connectAuthEmulator(auth, withDefaultEmulators(config).authUrl);
    }

    return auth;
  }
});

export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('Firebase Firestore', {
  providedIn: 'root',
  factory: () => {
    const firestore = getFirestore(inject(FIREBASE_APP));
    const config = inject(FIREBASE_CONNECTOR_CONFIG);

    if (config.production === false) {
      const emulators = withDefaultEmulators(config);
      connectFirestoreEmulator(firestore, emulators.firestoreHost, emulators.firestorePort);
    }

    return firestore;
  }
});

export const FIREBASE_FUNCTIONS = new InjectionToken<Functions>('Firebase Functions', {
  providedIn: 'root',
  factory: () => {
    const config = inject(FIREBASE_CONNECTOR_CONFIG);
    const functions = getFunctions(
      inject(FIREBASE_APP),
      config.functionsRegion ?? DEFAULT_FUNCTIONS_REGION
    );

    if (config.production === false) {
      const emulators = withDefaultEmulators(config);
      connectFunctionsEmulator(functions, emulators.functionsHost, emulators.functionsPort);
    }

    return functions;
  }
});

function withDefaultEmulators(config: FirebaseConnectorConfig): Required<FirebaseConnectorEmulatorConfig> {
  return {
    ...DEFAULT_EMULATORS,
    ...config.emulators
  };
}
