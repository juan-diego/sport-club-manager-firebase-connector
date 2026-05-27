import { inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import type { AuthState, AuthUser } from 'sport-club-manager-contracts/models';
import { AuthStateModel, UserRole, type AuthCredentials, type RegisterCredentials } from 'sport-club-manager-contracts/models';
import type {
  AuthProvider,
  RegistrationProvider,
  UserDetailProvider
} from 'sport-club-manager-contracts/providers';

import type { Auth, User } from 'firebase/auth';
import { getIdTokenResult, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { FIREBASE_AUTH } from '../config/firebase-connector.config.js';
import { REGISTRATION_PROVIDER, USER_DETAIL_PROVIDER } from '../providers/provider-tokens.js';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService implements AuthProvider {
  private readonly auth: Auth = inject(FIREBASE_AUTH);
  private readonly usersProvider: UserDetailProvider = inject(USER_DETAIL_PROVIDER);
  private readonly registrationProvider: RegistrationProvider = inject(REGISTRATION_PROVIDER);

  readonly #authState = signal<AuthState>(new AuthStateModel('loading'));
  readonly authState$ = toObservable(this.#authState).pipe(distinctUntilChanged());

  constructor() {
    onAuthStateChanged(this.auth, user => {
      this.toAuthState(user).then(authState => this.#authState.set(authState));
    });
  }

  async login({ email, password }: AuthCredentials): Promise<AuthState> {
    this.#authState.set(new AuthStateModel('loading'));

    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      const authState = await this.toAuthState(credential.user);
      this.#authState.set(authState);
      return authState;
    } catch (error) {
      this.#authState.set(new AuthStateModel('unauthenticated'));
      throw error;
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthState> {
    this.#authState.set(new AuthStateModel('loading'));

    try {
      const { email, password } = credentials;
      await this.registrationProvider.completeRegistration(credentials);
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      const authState = await this.toAuthState(credential.user);
      this.#authState.set(authState);
      return authState;
    } catch (error) {
      this.#authState.set(new AuthStateModel('unauthenticated'));
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.#authState.set(new AuthStateModel('unauthenticated'));
    await signOut(this.auth);
  }

  getAuthState(): AuthState {
    return this.#authState();
  }

  private toAuthUser(user: User | null | undefined): AuthUser | null | undefined {
    if (!user) {
      return user;
    }

    const authUser: AuthUser = { uid: user.uid };

    if (user.email) {
      authUser.email = user.email;
    }

    return authUser;
  }

  private async toAuthState(user: User | null | undefined): Promise<AuthState> {
    const authUser = this.toAuthUser(user);

    if (!authUser || !user) {
      return new AuthStateModel('unauthenticated');
    }

    const tokenResult = await getIdTokenResult(user);
    const tokenRole = tokenResult.claims['role'];

    authUser.claims = {
      role: Object.values(UserRole).includes(tokenRole as UserRole) ? tokenRole as UserRole : undefined,
      admin: tokenResult.claims['admin'] === true,
      owner: tokenResult.claims['owner'] === true
    };

    try {
      const userDetails = await firstValueFrom(this.usersProvider.get(authUser.uid));
      authUser.profile = userDetails;
    } catch (error) {
      console.warn(`Profile document not found for uid ${authUser.uid}`, error);
    }

    return new AuthStateModel('authenticated', authUser);
  }
}
