import { inject, Injectable } from '@angular/core';
import { defer, from, map, Observable } from 'rxjs';

import type {
  RegisterCredentials,
  SpaceRegistration,
  SpaceRegistrationContext,
  SpaceRegistrationCreate,
  SpaceRegistrationUpdate,
  UserInvitationCreate,
  UserInvitationResult
} from 'sport-club-manager-contracts/models';
import type { RegistrationProvider, SpaceRegistrationProvider } from 'sport-club-manager-contracts/providers';

import type { CollectionReference, DocumentData } from 'firebase/firestore';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS } from '../config/firebase-connector.config.js';

type CreateUserInvitationPayload = {
  email: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate?: string;
  memberCode: string;
  memberFrom: string;
  memberTo: string;
};

type InvitationFunctionResult = {
  uid: string;
  invitationCode: string;
  expiresAt: string;
};

type CompleteRegistrationPayload = {
  email: string;
  invitationCode: string;
  password: string;
};

type UserUidPayload = {
  uid: string;
};

type SpaceRegistrationContextResult = {
  clubTimeZone: string;
  serverNowIso: string;
  clubNowIso: string;
  clubTodayDateKey: string;
};

type SpaceRegistrationMutationPayload = {
  id?: string;
  spaceId: string;
  date: string;
  startTime: string;
  endTime?: string;
  note?: string;
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseRegistrationFunctionsService
  implements RegistrationProvider, SpaceRegistrationProvider
{
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly functions: Functions = inject(FIREBASE_FUNCTIONS);
  private readonly spaceRegistrationsCollectionName = 'spaceRegistrations';

  async createUserInvitation(invitation: UserInvitationCreate): Promise<UserInvitationResult> {
    const callable = httpsCallable<CreateUserInvitationPayload, InvitationFunctionResult>(
      this.functions,
      'createUserInvitation'
    );

    const result = await callable({
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      nationalId: invitation.nationalId,
      birthDate: invitation.birthDate ? this.toDateInput(invitation.birthDate) : undefined,
      memberCode: invitation.memberCode,
      memberFrom: this.toDateInput(invitation.memberFrom),
      memberTo: this.toDateInput(invitation.memberTo)
    });

    return this.toInvitationResult(result.data);
  }

  async completeRegistration(credentials: RegisterCredentials): Promise<void> {
    const callable = httpsCallable<CompleteRegistrationPayload, unknown>(
      this.functions,
      'completeRegistration'
    );

    await callable({
      email: credentials.email,
      invitationCode: credentials.invitationCode,
      password: credentials.password
    });
  }

  async regenerateInvitationCode(uid: string): Promise<UserInvitationResult> {
    const callable = httpsCallable<UserUidPayload, InvitationFunctionResult>(
      this.functions,
      'regenerateInvitationCode'
    );
    const result = await callable({ uid });
    return this.toInvitationResult(result.data);
  }

  async cancelInvitation(uid: string): Promise<void> {
    const callable = httpsCallable<UserUidPayload, unknown>(this.functions, 'cancelInvitation');
    await callable({ uid });
  }

  getByDate(date: string): Observable<SpaceRegistration[]> {
    return defer(() => {
      const registrationsQuery = query(this.collectionRef, where('date', '==', date));

      return from(getDocs(registrationsQuery)).pipe(
        map(snapshot =>
          snapshot.docs
            .map(registration => this.mapRegistrationDoc(registration.id, registration.data()))
            .sort((left, right) => left.startTime.localeCompare(right.startTime))
        )
      );
    });
  }

  getUpcomingForUser(userId: string, fromDateTime: Date): Observable<SpaceRegistration[]> {
    return defer(() => {
      const registrationsQuery = query(this.collectionRef, where('userId', '==', userId));

      return from(getDocs(registrationsQuery)).pipe(
        map(snapshot =>
          snapshot.docs
            .map(registration => this.mapRegistrationDoc(registration.id, registration.data()))
            .filter(registration => registration.startAt.getTime() >= fromDateTime.getTime())
            .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
        )
      );
    });
  }

  async getContext(): Promise<SpaceRegistrationContext> {
    const callable = httpsCallable<unknown, SpaceRegistrationContextResult>(
      this.functions,
      'getSpaceRegistrationContext'
    );
    const result = await callable({});
    return result.data;
  }

  async create(registration: SpaceRegistrationCreate): Promise<void> {
    const callable = httpsCallable<SpaceRegistrationMutationPayload, unknown>(
      this.functions,
      'createSpaceRegistration'
    );
    await callable(this.toSpaceRegistrationPayload(registration));
  }

  async update(id: string, registration: SpaceRegistrationUpdate): Promise<void> {
    const callable = httpsCallable<SpaceRegistrationMutationPayload, unknown>(
      this.functions,
      'updateSpaceRegistration'
    );
    await callable({ id, ...this.toSpaceRegistrationPayload(registration) });
  }

  async delete(id: string): Promise<void> {
    const callable = httpsCallable<{ id: string }, unknown>(
      this.functions,
      'deleteSpaceRegistration'
    );
    await callable({ id });
  }

  private toInvitationResult(result: InvitationFunctionResult): UserInvitationResult {
    return {
      uid: result.uid,
      invitationCode: result.invitationCode,
      expiresAt: new Date(result.expiresAt)
    };
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toSpaceRegistrationPayload(
    registration: SpaceRegistrationCreate | SpaceRegistrationUpdate
  ): SpaceRegistrationMutationPayload {
    return {
      spaceId: registration.spaceId,
      date: registration.date,
      startTime: registration.startTime,
      endTime: registration.endTime,
      note: registration.note
    };
  }

  private mapRegistrationDoc(id: string, data: DocumentData): SpaceRegistration {
    const startAt = this.toDate(data['startAt']);
    const endAt = this.toDate(data['endAt']);

    return {
      id,
      spaceId: data['spaceId'],
      spaceName: data['spaceName'] ?? '',
      userId: data['userId'],
      userDisplayName: data['userDisplayName'] ?? '',
      note: data['note'] ?? undefined,
      date: data['date'],
      startTime: data['startTime'],
      startSlotTime: data['startSlotTime'] ?? undefined,
      endTime: data['endTime'] ?? undefined,
      startAt: startAt ?? this.combineLocalDateTime(data['date'], data['startTime']),
      endAt,
      createdAt: this.toDate(data['createdAt']),
      updatedAt: this.toDate(data['updatedAt'])
    };
  }

  private combineLocalDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00`);
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

  private get collectionRef(): CollectionReference<DocumentData> {
    return collection(this.firestore, this.spaceRegistrationsCollectionName);
  }
}
