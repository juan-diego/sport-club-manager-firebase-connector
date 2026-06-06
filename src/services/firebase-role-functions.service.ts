import { inject, Injectable } from '@angular/core';

import type { UserRole } from '@sport-club-manager/contracts/models';
import type { RoleProvider } from '@sport-club-manager/contracts/providers';

import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../config/firebase-connector.config.js';

type SetUserRolePayload = {
  uid: string;
  role: UserRole;
};

type BootstrapFirstOwnerPayload = {
  email: string;
  password: string;
  secret: string;
};

type GetUserRolePayload = {
  uid: string;
};

type GetUserRoleResult = {
  uid: string;
  role: UserRole;
};

type GetUserRolesPayload = {
  uids: string[];
};

type GetUserRolesResult = {
  roles: Record<string, UserRole>;
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseRoleFunctionsService implements RoleProvider {
  private readonly functions: Functions = inject(FIREBASE_FUNCTIONS);

  async setUserRole(uid: string, role: UserRole): Promise<void> {
    const callable = httpsCallable<SetUserRolePayload, unknown>(this.functions, 'setUserRole');
    await callable({ uid, role });
  }

  async getUserRole(uid: string): Promise<UserRole> {
    const callable = httpsCallable<GetUserRolePayload, GetUserRoleResult>(
      this.functions,
      'getUserRole'
    );
    const result = await callable({ uid });
    return result.data.role;
  }

  async getUserRoles(uids: string[]): Promise<Record<string, UserRole>> {
    if (uids.length === 0) {
      return {};
    }

    const callable = httpsCallable<GetUserRolesPayload, GetUserRolesResult>(
      this.functions,
      'getUserRoles'
    );
    const result = await callable({ uids });
    return result.data.roles;
  }

  async bootstrapFirstOwner(email: string, password: string, secret: string): Promise<void> {
    const callable = httpsCallable<BootstrapFirstOwnerPayload, unknown>(
      this.functions,
      'bootstrapFirstOwner'
    );
    await callable({ email, password, secret });
  }
}
