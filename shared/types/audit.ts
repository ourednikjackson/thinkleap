export type AuditAction = 
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'SEARCH_PERFORMED'
  | 'SAVED_SEARCH_CREATED'
  | 'SAVED_SEARCH_UPDATED'
  | 'SAVED_SEARCH_DELETED'
  | 'SAVED_SEARCH_EXECUTED';

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: AuditAction;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface CreateAuditLogDTO {
  userId?: string;
  action: AuditAction;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}