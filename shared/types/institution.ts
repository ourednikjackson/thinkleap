export interface Institution {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SamlIdentityProvider {
  id: string;
  institutionId: string;
  entityId: string;
  certificate: string;
  ssoLoginUrl: string;
  ssoLogoutUrl?: string;
  isFederated: boolean;
  federationName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInstitution {
  id: string;
  userId: string;
  institutionId: string;
  institutionalEmail?: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  institution?: Institution;
}

export interface InstitutionalSubscription {
  id: string;
  institutionId: string;
  provider: string;
  subscriptionLevel: string;
  accessDetails?: Record<string, any>;
  startDate: Date;
  endDate?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}