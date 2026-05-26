import { inject, Injectable } from '@angular/core';
import { defer, from, Observable, switchMap } from 'rxjs';

import {
  ClubMembershipStatus,
  UserRole,
  UserStatus,
  type ClubMembership,
  type User,
  type UserClubDataUpdate,
  type UserConfigurationUpdate,
  type UserDetail,
  type UserInvitationInfo,
  type UserPersonalDataUpdate,
  type UserProfile
} from 'sport-club-manager-contracts/models';
import type { RoleProvider, UserDetailProvider } from 'sport-club-manager-contracts/providers';

import type { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS } from '../config/firebase-connector.config.js';
import { ROLE_PROVIDER } from '../providers/provider-tokens.js';

type UpdateUserPersonalDataPayload = {
  uid: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate?: string;
};

type UpdateUserClubDataPayload = {
  uid: string;
  memberCode: string;
  memberFrom: string;
  memberTo: string;
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseUsersService implements UserDetailProvider {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly functions: Functions = inject(FIREBASE_FUNCTIONS);
  private readonly roleProvider: RoleProvider = inject(ROLE_PROVIDER);
  private readonly usersCollection = 'users';
  private readonly userProfilesCollection = 'userProfiles';
  private readonly clubMembershipsCollection = 'clubMemberships';

  get(uid: string): Observable<UserDetail> {
    return defer(() => from(this.getUserDetail(uid)));
  }

  getAll(): Observable<UserDetail[]> {
    return defer(() => {
      const usersQuery = query(
        collection(this.firestore, this.usersCollection),
        orderBy('createdAt', 'desc')
      );

      return from(getDocs(usersQuery)).pipe(
        switchMap(async snapshot => {
          const uids = snapshot.docs.map(docSnapshot => docSnapshot.id);
          const roles = await this.getUserRoles(uids);
          return Promise.all(
            snapshot.docs.map(docSnapshot =>
              this.getUserDetail(docSnapshot.id, docSnapshot, roles[docSnapshot.id])
            )
          );
        })
      );
    });
  }

  async updateConfiguration(uid: string, configuration: UserConfigurationUpdate): Promise<void> {
    await updateDoc(doc(this.firestore, this.usersCollection, uid), {
      status: configuration.status,
      updatedAt: serverTimestamp()
    });
  }

  async updatePersonalData(uid: string, personalData: UserPersonalDataUpdate): Promise<void> {
    const callable = httpsCallable<UpdateUserPersonalDataPayload, unknown>(
      this.functions,
      'updateUserPersonalData'
    );

    await callable({
      uid,
      firstName: personalData.firstName,
      lastName: personalData.lastName,
      nationalId: personalData.nationalId,
      birthDate: personalData.birthDate ? this.toDateInput(personalData.birthDate) : undefined
    });
  }

  async updateClubData(uid: string, clubData: UserClubDataUpdate): Promise<void> {
    const callable = httpsCallable<UpdateUserClubDataPayload, unknown>(
      this.functions,
      'updateUserClubData'
    );

    await callable({
      uid,
      memberCode: clubData.memberCode,
      memberFrom: this.toDateInput(clubData.memberFrom),
      memberTo: this.toDateInput(clubData.memberTo)
    });
  }

  private async getUserRoles(uids: string[]): Promise<Record<string, UserRole>> {
    const chunks: string[][] = [];

    for (let index = 0; index < uids.length; index += 100) {
      chunks.push(uids.slice(index, index + 100));
    }

    const chunkResults = await Promise.all(chunks.map(chunk => this.roleProvider.getUserRoles(chunk)));
    return Object.assign({}, ...chunkResults);
  }

  private async getUserDetail(
    uid: string,
    knownAccountSnapshot?: DocumentSnapshot<DocumentData>,
    knownRole?: UserRole
  ): Promise<UserDetail> {
    const [accountResult, profileResult, membershipResult, roleResult] = await Promise.allSettled([
      knownAccountSnapshot
        ? Promise.resolve(knownAccountSnapshot)
        : getDoc(doc(this.firestore, this.usersCollection, uid)),
      getDoc(doc(this.firestore, this.userProfilesCollection, uid)),
      getDoc(doc(this.firestore, this.clubMembershipsCollection, uid)),
      knownRole ? Promise.resolve(knownRole) : this.roleProvider.getUserRole(uid)
    ]);

    const account = this.snapshotData(accountResult);
    const profile = this.snapshotData(profileResult);
    const membership = this.snapshotData(membershipResult);
    const role = this.settledRole(roleResult);

    if (!account && !profile && !membership) {
      throw new Error(`User with uid ${uid} not found`);
    }

    const accountModel = this.mapAccount(uid, account);

    return {
      uid,
      account: accountModel,
      profile: this.mapProfile(uid, profile),
      role,
      membership: this.mapMembership(uid, membership),
      federationLicenses: [],
      isAdmin(): boolean {
        return role === UserRole.ADMIN;
      },
      isOwner(): boolean {
        return role === UserRole.OWNER;
      },
      isActive(): boolean {
        return accountModel?.isActive() ?? true;
      }
    };
  }

  private snapshotData(
    result: PromiseSettledResult<DocumentSnapshot<DocumentData>>
  ): DocumentData | undefined {
    if (result.status === 'rejected' || !result.value.exists()) {
      return undefined;
    }

    return result.value.data();
  }

  private settledRole(result: PromiseSettledResult<UserRole>): UserRole | undefined {
    if (result.status === 'rejected') {
      return undefined;
    }

    return result.value;
  }

  private mapAccount(uid: string, data: DocumentData | undefined): User | undefined {
    if (!data) {
      return undefined;
    }

    const status = this.getUserStatus(data);

    return {
      uid,
      emailNormalized: typeof data['emailNormalized'] === 'string' ? data['emailNormalized'] : undefined,
      status,
      createdAt: this.toDate(data['createdAt']),
      updatedAt: this.toDate(data['updatedAt']),
      invitation: this.mapInvitation(data['invitation']),
      isActive(): boolean {
        return status === UserStatus.ACTIVE;
      }
    };
  }

  private mapProfile(uid: string, data: DocumentData | undefined): UserProfile {
    return {
      uid,
      firstName: typeof data?.['firstName'] === 'string' ? data['firstName'] : '',
      lastName: typeof data?.['lastName'] === 'string' ? data['lastName'] : '',
      nationalId: typeof data?.['nationalId'] === 'string' ? data['nationalId'] : '',
      birthDate: this.toDate(data?.['birthDate']),
      createdAt: this.toDate(data?.['createdAt']),
      updatedAt: this.toDate(data?.['updatedAt'])
    };
  }

  private mapMembership(uid: string, data: DocumentData | undefined): ClubMembership | undefined {
    if (!data) {
      return undefined;
    }

    return {
      uid,
      memberCode: typeof data['memberCode'] === 'string' ? data['memberCode'] : '',
      status: this.getClubMembershipStatus(data),
      memberFrom: this.toDate(data['memberFrom']),
      memberTo: this.toDate(data['memberTo']),
      createdAt: this.toDate(data['createdAt']),
      updatedAt: this.toDate(data['updatedAt'])
    };
  }

  private toDate(value: unknown): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    if (value instanceof Timestamp) {
      return value.toDate();
    }

    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
      return value.toDate();
    }

    const parsedDate = new Date(String(value));
    return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
  }

  private mapInvitation(value: unknown): UserInvitationInfo | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const data = value as Record<string, unknown>;

    return {
      expiresAt: this.toDate(data['expiresAt']),
      createdAt: this.toDate(data['createdAt']),
      createdByUid: typeof data['createdByUid'] === 'string' ? data['createdByUid'] : undefined,
      usedAt: this.toDate(data['usedAt']),
      canceledAt: this.toDate(data['canceledAt']),
      canceledByUid: typeof data['canceledByUid'] === 'string' ? data['canceledByUid'] : undefined,
      lockedAt: this.toDate(data['lockedAt']),
      failedAttempts: typeof data['failedAttempts'] === 'number' ? data['failedAttempts'] : 0
    };
  }

  private getUserStatus(data: DocumentData | undefined): UserStatus {
    const status = typeof data?.['status'] === 'string' ? data['status'].toUpperCase() : '';

    if (Object.values(UserStatus).includes(status as UserStatus)) {
      return status as UserStatus;
    }

    return UserStatus.ACTIVE;
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getClubMembershipStatus(data: DocumentData): ClubMembershipStatus {
    const status = typeof data['status'] === 'string' ? data['status'].toUpperCase() : '';

    if (Object.values(ClubMembershipStatus).includes(status as ClubMembershipStatus)) {
      return status as ClubMembershipStatus;
    }

    return ClubMembershipStatus.ACTIVE;
  }
}
