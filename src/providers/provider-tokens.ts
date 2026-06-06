import { InjectionToken } from '@angular/core';

import type {
  AuthProvider,
  ClubSettingsProvider,
  FederationProvider,
  RegistrationProvider,
  RoleProvider,
  SpaceProvider,
  SpaceRegistrationProvider,
  UserDetailProvider
} from '@sport-club-manager/contracts/providers';

export const AUTH_PROVIDER = new InjectionToken<AuthProvider>('Auth provider');
export const USER_DETAIL_PROVIDER = new InjectionToken<UserDetailProvider>('User detail provider');
export const REGISTRATION_PROVIDER = new InjectionToken<RegistrationProvider>('Registration provider');
export const ROLE_PROVIDER = new InjectionToken<RoleProvider>('Role provider');
export const CLUB_SETTINGS_PROVIDER = new InjectionToken<ClubSettingsProvider>('Club settings provider');
export const FEDERATION_PROVIDER = new InjectionToken<FederationProvider>('Federation provider');
export const SPACE_PROVIDER = new InjectionToken<SpaceProvider>('Space provider');
export const SPACE_REGISTRATION_PROVIDER = new InjectionToken<SpaceRegistrationProvider>('Space registration provider');
