import { DatabaseService } from '../database/database.service';
import { Logger } from '../logger';
import { 
  AuditLogEntry, 
  CreateAuditLogDTO,
  AuditAction 
} from '@thinkleap/shared/types/audit';

export class AuditLogService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: Logger
  ) {}

  /**
   * Create a new audit log entry
   */
  async log(data: CreateAuditLogDTO): Promise<AuditLogEntry> {
    try {
      const result = await this.databaseService.query(
        `INSERT INTO audit_logs (
          user_id,
          action,
          details,
          ip_address,
          user_agent
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          data.userId,
          data.action,
          data.details ? JSON.stringify(data.details) : null,
          data.ipAddress,
          data.userAgent
        ]
      );
  
      return this.mapAuditLogEntry(result.rows[0]);
    } catch (err: unknown) {
      this.logger.error(
        'Failed to create audit log entry',
        err instanceof Error ? err : new Error('Unknown error'),
        { data }
      );
      
      return {
        id: 'error',
        action: data.action,
        userId: data.userId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        createdAt: new Date()
      };
    }
  }

  /**
   * Get audit logs for a specific user
   */
  async getByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      actions?: AuditAction[];
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const {
      page = 1,
      limit = 50,
      actions,
      startDate,
      endDate
    } = options;

    const offset = (page - 1) * limit;
    const params: any[] = [userId];
    let paramCount = 1;

    let whereClause = 'WHERE user_id = $1';
    if (actions?.length) {
      paramCount++;
      whereClause += ` AND action = ANY($${paramCount})`;
      params.push(actions);
    }
    if (startDate) {
      paramCount++;
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
    }
    if (endDate) {
      paramCount++;
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
    }

    // Get total count
    const countResult = await this.databaseService.query(
      `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
      params
    );

    // Get paginated results
    const result = await this.databaseService.query(
      `SELECT * FROM audit_logs 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    return {
      logs: result.rows.map(this.mapAuditLogEntry),
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Get recent audit logs for system monitoring
   */
  async getRecent(limit: number = 100): Promise<AuditLogEntry[]> {
    const result = await this.databaseService.query(
      `SELECT * FROM audit_logs 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(this.mapAuditLogEntry);
  }

  /**
   * Get audit log statistics for a time period
   */
  async getStats(startDate: Date, endDate: Date): Promise<{
    totalLogs: number;
    actionCounts: Record<AuditAction, number>;
    userCounts: Record<string, number>;
  }> {
    const result = await this.databaseService.query(
      `SELECT 
        COUNT(*) as total,
        action,
        COUNT(DISTINCT user_id) as unique_users
       FROM audit_logs
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY action`,
      [startDate, endDate]
    );

    const actionCounts = result.rows.reduce((acc, row) => {
      acc[row.action] = parseInt(row.count);
      return acc;
    }, {} as Record<AuditAction, number>);

    return {
      totalLogs: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      actionCounts,
      userCounts: result.rows.reduce((acc, row) => {
        acc[row.action] = parseInt(row.unique_users);
        return acc;
      }, {} as Record<string, number>)
    };
  }

  private mapAuditLogEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at
    };
  }
}