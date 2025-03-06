// backend/src/config/types.ts
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  test?: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
}

export interface RedisConfig {
  url: string;
  host?: string;
  port?: number;
  password?: string;
}

export interface TargetSiteConfig {
  baseUrl: string;
  apiUrl?: string;
  apiKey?: string;
}

export interface SamlConfig {
  issuer: string;
  callbackUrl: string;
  logoutUrl?: string;
  technicalContact: string;
  defaultIdpCert?: string;
}

export interface Config {
  env: string;
  port: number;
  db: DatabaseConfig;
  redis: RedisConfig;
  cors: {
    origin: string;
  };
  api: {
    pubmed?: {
      key?: string;
    };
    crossref?: {
      email?: string;
    };
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  session: {
    secret: string;
    maxAge: number; // in milliseconds
  };
  saml?: SamlConfig;
  targetSite: TargetSiteConfig;
  extension?: {
    uploadPath?: string;
    apiKey?: string;
    maxFileSize?: number;
  };
}