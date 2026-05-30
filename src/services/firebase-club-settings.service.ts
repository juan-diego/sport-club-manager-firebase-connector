import { inject, Injectable } from '@angular/core';
import { defer, from, map, Observable } from 'rxjs';

import type {
  ClubSettings,
  FederationRegionCodeSettings,
  FieldRuleSettings,
  NationalIdSettings,
  ValueNormalization
} from 'sport-club-manager-contracts/models';
import { createEmptyFieldRuleSettings } from 'sport-club-manager-contracts/models';
import type { ClubSettingsProvider } from 'sport-club-manager-contracts/providers';

import type { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FIRESTORE, FIREBASE_FUNCTIONS } from '../config/firebase-connector.config.js';

type UpdateClubSettingsPayload = Omit<ClubSettings, 'metadata'> & {
  metadata: {
    version: number | null;
  };
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseClubSettingsService implements ClubSettingsProvider {
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  private readonly functions: Functions = inject(FIREBASE_FUNCTIONS);
  private readonly appSettingsCollection = 'appSettings';
  private readonly clubSettingsDocumentId = 'club';

  get(): Observable<ClubSettings | null> {
    return defer(() => from(getDoc(this.documentRef))).pipe(
      map(snapshot => (snapshot.exists() ? this.mapClubSettings(snapshot) : null))
    );
  }

  async update(settings: ClubSettings): Promise<void> {
    const callable = httpsCallable<UpdateClubSettingsPayload, unknown>(
      this.functions,
      'updateClubSettings'
    );

    await callable({
      countryCode: settings.countryCode,
      timeZone: settings.timeZone,
      sport: settings.sport,
      personalData: settings.personalData,
      clubMembership: settings.clubMembership,
      federations: settings.federations,
      metadata: {
        version: settings.metadata.version
      }
    });
  }

  private get documentRef() {
    return doc(this.firestore, this.appSettingsCollection, this.clubSettingsDocumentId);
  }

  private mapClubSettings(snapshot: DocumentSnapshot<DocumentData>): ClubSettings {
    const data = snapshot.data() ?? {};
    const personalData = this.readRecord(data['personalData']);
    const clubMembership = this.readRecord(data['clubMembership']);
    const federations = this.readRecord(data['federations']);
    const metadata = this.readRecord(data['metadata']);
    const sport = this.readRecord(data['sport']);

    return {
      countryCode: this.readOptionalString(data['countryCode']),
      timeZone: this.readOptionalString(data['timeZone']),
      sport: {
        code: this.readOptionalString(sport['code']),
        name: this.readOptionalString(sport['name'])
      },
      personalData: {
        nationalId: this.mapNationalIdSettings(personalData['nationalId'])
      },
      clubMembership: {
        memberCode: this.mapFieldRuleSettings(clubMembership['memberCode'])
      },
      federations: {
        regionCode: this.mapFederationRegionCodeSettings(federations['regionCode'])
      },
      metadata: {
        version: this.readOptionalNumber(metadata['version']),
        updatedAt: this.toDate(metadata['updatedAt']),
        updatedByUid: this.readOptionalString(metadata['updatedByUid'])
      }
    };
  }

  private mapNationalIdSettings(value: unknown): NationalIdSettings {
    const data = this.readRecord(value);

    return {
      ...this.mapFieldRuleSettings(value),
      validatorKey: this.readOptionalString(data['validatorKey'])
    };
  }

  private mapFederationRegionCodeSettings(value: unknown): FederationRegionCodeSettings {
    const data = this.readRecord(value);

    return {
      enabled: typeof data['enabled'] === 'boolean' ? data['enabled'] : false,
      allowedValues: this.readStringArray(data['allowedValues']),
      label: this.readOptionalString(data['label']),
      placeholder: null,
      pattern: null,
      maxLength: null,
      normalization: [],
      helpText: this.readOptionalString(data['helpText'])
    };
  }

  private mapFieldRuleSettings(value: unknown): FieldRuleSettings {
    const defaults = createEmptyFieldRuleSettings();
    const data = this.readRecord(value);

    return {
      label: this.readOptionalString(data['label']) ?? defaults.label,
      placeholder: this.readOptionalString(data['placeholder']) ?? defaults.placeholder,
      pattern: this.readOptionalString(data['pattern']) ?? defaults.pattern,
      maxLength: this.readOptionalNumber(data['maxLength']) ?? defaults.maxLength,
      normalization: this.readNormalizationList(data['normalization']),
      helpText: this.readOptionalString(data['helpText']) ?? defaults.helpText
    };
  }

  private readRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  }

  private readOptionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readOptionalNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private readStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter(
          (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
        )
      : [];
  }

  private readNormalizationList(value: unknown): ValueNormalization[] {
    const allowedValues: readonly ValueNormalization[] = ['TRIM', 'UPPERCASE', 'REMOVE_SPACES'] as const;

    return this.readStringArray(value)
      .map(entry => entry.toUpperCase())
      .filter((entry): entry is ValueNormalization => allowedValues.includes(entry as ValueNormalization));
  }

  private toDate(value: unknown): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
      return value.toDate();
    }

    const parsedDate = new Date(String(value));
    return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
  }
}
