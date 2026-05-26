import { inject, Injectable } from '@angular/core';
import { defer, from, map, Observable } from 'rxjs';

import type { Space } from 'sport-club-manager-contracts/models';
import type { SpaceProvider } from 'sport-club-manager-contracts/providers';

import type { CollectionReference, DocumentData } from 'firebase/firestore';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import { FIREBASE_FIRESTORE } from '../config/firebase-connector.config.js';

@Injectable({
  providedIn: 'root'
})
export class FirebaseSpacesService implements SpaceProvider {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly collectionName = 'spaces';

  getAll(): Observable<Space[]> {
    return defer(() => from(getDocs(this.collectionRef))).pipe(
      map(snapshot =>
        snapshot.docs.map(
          docSnapshot =>
            ({
              id: docSnapshot.id,
              ...docSnapshot.data()
            }) as Space
        )
      )
    );
  }

  get(id: string): Observable<Space | undefined> {
    return defer(() => from(getDoc(doc(this.firestore, this.collectionName, id)))).pipe(
      map(snapshot => {
        if (!snapshot.exists()) {
          return undefined;
        }

        return {
          id: snapshot.id,
          ...snapshot.data()
        } as Space;
      })
    );
  }

  async create(space: Omit<Space, 'id'>): Promise<void> {
    const newDocRef = doc(this.collectionRef);
    await setDoc(newDocRef, space);
  }

  async update(id: string, space: Partial<Space>): Promise<void> {
    await updateDoc(doc(this.firestore, this.collectionName, id), space);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, this.collectionName, id));
  }

  private get collectionRef(): CollectionReference<DocumentData> {
    return collection(this.firestore, this.collectionName);
  }
}
