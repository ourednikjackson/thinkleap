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
  
  export interface SamlConfig {
  baseUrl: string;
  callbackUrl?: string;
  entryPoint: string;
  issuer: string;
  cert: string;
  identifierFormat?: string;
  disableRequestedAuthnContext?: boolean;
  signatureAlgorithm?: string;
  cookieDomain?: string;
  callbackPath?: string;
  entityId?: string;
}

export interface SessionConfig {
  secret: string;
  cookieMaxAge?: number;
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
    };
    jwt: {
      secret: string;
      refreshSecret: string;
      accessTokenExpiry: string;
      refreshTokenExpiry: string;
    };
    saml: SamlConfig;
    session?: SessionConfig;
  }