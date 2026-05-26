import { makeEnvironmentProviders } from '@angular/core';
import type { Provider } from '@angular/core';

import { FIREBASE_CONNECTOR_CONFIG } from '../config/firebase-connector.config.js';
import type { FirebaseConnectorConfig } from '../config/firebase-connector.config.js';
import {
  AUTH_PROVIDER,
  CLUB_SETTINGS_PROVIDER,
  FEDERATION_PROVIDER,
  REGISTRATION_PROVIDER,
  ROLE_PROVIDER,
  SPACE_PROVIDER,
  SPACE_REGISTRATION_PROVIDER,
  USER_DETAIL_PROVIDER
} from './provider-tokens.js';
import { FirebaseAuthService } from '../services/firebase-auth.service.js';
import { FirebaseClubSettingsService } from '../services/firebase-club-settings.service.js';
import { FirebaseFederationsService } from '../services/firebase-federations.service.js';
import { FirebaseRegistrationFunctionsService } from '../services/firebase-registration-functions.service.js';
import { FirebaseRoleFunctionsService } from '../services/firebase-role-functions.service.js';
import { FirebaseSpacesService } from '../services/firebase-spaces.service.js';
import { FirebaseUsersService } from '../services/firebase-users.service.js';

export function provideFirebaseConnector(config: FirebaseConnectorConfig) {
  return makeEnvironmentProviders([
    { provide: FIREBASE_CONNECTOR_CONFIG, useValue: config },
    ...provideFirebaseProviders()
  ]);
}

export function provideFirebaseProviders(): Provider[] {
  return [
    FirebaseAuthService,
    FirebaseClubSettingsService,
    FirebaseFederationsService,
    FirebaseRegistrationFunctionsService,
    FirebaseRoleFunctionsService,
    FirebaseSpacesService,
    FirebaseUsersService,
    { provide: AUTH_PROVIDER, useExisting: FirebaseAuthService },
    { provide: CLUB_SETTINGS_PROVIDER, useExisting: FirebaseClubSettingsService },
    { provide: USER_DETAIL_PROVIDER, useExisting: FirebaseUsersService },
    { provide: REGISTRATION_PROVIDER, useExisting: FirebaseRegistrationFunctionsService },
    { provide: ROLE_PROVIDER, useExisting: FirebaseRoleFunctionsService },
    { provide: FEDERATION_PROVIDER, useExisting: FirebaseFederationsService },
    { provide: SPACE_PROVIDER, useExisting: FirebaseSpacesService },
    { provide: SPACE_REGISTRATION_PROVIDER, useExisting: FirebaseRegistrationFunctionsService }
  ];
}
