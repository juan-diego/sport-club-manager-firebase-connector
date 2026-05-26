import { inject, Injectable } from '@angular/core';
import { defer, from, map, Observable } from 'rxjs';

import type { FederationInfo } from 'sport-club-manager-contracts/models';
import type { FederationProvider } from 'sport-club-manager-contracts/providers';

import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS } from '../config/firebase-connector.config.js';

type FederationMutationPayload = {
  id?: string;
  name: string;
  scope: 'REGIONAL' | 'NATIONAL';
  regionCode?: string;
};

type CreateFederationResult = {
  id: string;
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseFederationsService implements FederationProvider {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly functions: Functions = inject(FIREBASE_FUNCTIONS);
  private readonly federationsCollection = 'federations';

  getAll(): Observable<FederationInfo[]> {
    return defer(() => {
      const federationsQuery = query(
        collection(this.firestore, this.federationsCollection),
        orderBy('name', 'asc')
      );

      return from(getDocs(federationsQuery)).pipe(
        map(snapshot => snapshot.docs.map(docSnapshot => this.mapFederation(docSnapshot)))
      );
    });
  }

  get(id: string): Observable<FederationInfo> {
    return defer(() => from(getDoc(doc(this.firestore, this.federationsCollection, id)))).pipe(
      map(snapshot => {
        if (!snapshot.exists()) {
          throw new Error(`Federation with id ${id} not found`);
        }

        return this.mapFederation(snapshot);
      })
    );
  }

  async create(federation: Omit<FederationInfo, 'id'>): Promise<string> {
    const callable = httpsCallable<FederationMutationPayload, CreateFederationResult>(
      this.functions,
      'createFederation'
    );
    const result = await callable(this.toFederationPayload(federation));
    return result.data.id;
  }

  async update(id: string, federation: Partial<FederationInfo>): Promise<void> {
    const callable = httpsCallable<FederationMutationPayload, unknown>(
      this.functions,
      'updateFederation'
    );

    await callable({
      id,
      ...this.toFederationPayload(federation)
    });
  }

  async delete(id: string): Promise<void> {
    const callable = httpsCallable<{ id: string }, unknown>(this.functions, 'deleteFederation');
    await callable({ id });
  }

  private mapFederation(
    docSnapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>
  ): FederationInfo {
    const data = docSnapshot.data()!;

    return {
      id: docSnapshot.id,
      name: typeof data['name'] === 'string' ? data['name'] : '',
      scope:
        data['scope'] === 'REGIONAL' || data['scope'] === 'NATIONAL'
          ? data['scope']
          : 'REGIONAL',
      regionCode: typeof data['regionCode'] === 'string' ? data['regionCode'] : undefined
    };
  }

  private toFederationPayload(federation: Partial<FederationInfo>): FederationMutationPayload {
    return {
      name: federation.name ?? '',
      scope: federation.scope ?? 'REGIONAL',
      regionCode: federation.regionCode
    };
  }
}
