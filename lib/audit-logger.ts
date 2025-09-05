/**
 * Enterprise Audit Logging System
 * SOC 2 compliant audit trails for all system activities
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export enum AuditEventType {
  // Authentication events
  USER_SIGN_IN = 'user_sign_in',
  USER_SIGN_OUT = 'user_sign_out',
  USER_SIGN_UP = 'user_sign_up',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGE = 'password_change',

  // Project events
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_DELETED = 'project_deleted',
  PROJECT_SHARED = 'project_shared',
  PROJECT_UNSHARED = 'project_unshared',

  // Collaboration events
  COLLABORATION_STARTED = 'collaboration_started',
  COLLABORATION_ENDED = 'collaboration_ended',
  FILE_EDITED = 'file_edited',
  COMMENT_ADDED = 'comment_added',
  COMMENT_RESOLVED = 'comment_resolved',

  // Deployment events
  DEPLOYMENT_STARTED = 'deployment_started',
  DEPLOYMENT_COMPLETED = 'deployment_completed',
  DEPLOYMENT_FAILED = 'deployment_failed',
  DEPLOYMENT_ROLLED_BACK = 'deployment_rolled_back',

  // Team events
  TEAM_CREATED = 'team_created',
  TEAM_UPDATED = 'team_updated',
  TEAM_DELETED = 'team_deleted',
  MEMBER_INVITED = 'member_invited',
  MEMBER_JOINED = 'member_joined',
  MEMBER_REMOVED = 'member_removed',
  MEMBER_ROLE_CHANGED = 'member_role_changed',

  // Security events
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',

  // System events
  SYSTEM_BACKUP = 'system_backup',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  CONFIGURATION_CHANGED = 'configuration_changed'
}

export interface AuditEvent {
  id?: string;
  userId: string;
  eventType: AuditEventType;
  resourceType: string;
  resourceId: string;
  action: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AuditLogger {
  private static instance: AuditLogger;
  private eventQueue: AuditEvent[] = [];
  private isProcessing = false;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Add to queue for batch processing
    this.eventQueue.push(auditEvent);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }

    // For critical events, log immediately
    if (event.severity === 'critical') {
      await this.logImmediately(auditEvent);
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(eventType: AuditEventType, userId: string, details: Record<string, any>, req?: any): Promise<void> {
    await this.log({
      userId,
      eventType,
      resourceType: 'authentication',
      resourceId: userId,
      action: eventType.replace('_', ' '),
      details,
      ipAddress: this.getClientIP(req),
      userAgent: this.getUserAgent(req),
      severity: 'medium'
    });
  }

  /**
   * Log project events
   */
  async logProject(eventType: AuditEventType, userId: string, projectId: string, details: Record<string, any>, req?: any): Promise<void> {
    await this.log({
      userId,
      eventType,
      resourceType: 'project',
      resourceId: projectId,
      action: eventType.replace('_', ' '),
      details,
      ipAddress: this.getClientIP(req),
      userAgent: this.getUserAgent(req),
      severity: 'low'
    });
  }

  /**
   * Log team events
   */
  async logTeam(eventType: AuditEventType, userId: string, teamId: string, details: Record<string, any>, req?: any): Promise<void> {
    await this.log({
      userId,
      eventType,
      resourceType: 'team',
      resourceId: teamId,
      action: eventType.replace('_', ' '),
      details,
      ipAddress: this.getClientIP(req),
      userAgent: this.getUserAgent(req),
      severity: 'medium'
    });
  }

  /**
   * Log security events
   */
  async logSecurity(eventType: AuditEventType, userId: string, details: Record<string, any>, req?: any): Promise<void> {
    await this.log({
      userId,
      eventType,
      resourceType: 'security',
      resourceId: userId,
      action: eventType.replace('_', ' '),
      details,
      ipAddress: this.getClientIP(req),
      userAgent: this.getUserAgent(req),
      severity: 'high'
    });
  }

  /**
   * Get audit trail for a resource
   */
  async getAuditTrail(resourceType: string, resourceId: string, limit = 100): Promise<AuditEvent[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit trail:', error);
      return [];
    }

    return data.map(this.transformAuditEvent);
  }

  /**
   * Get user activity log
   */
  async getUserActivity(userId: string, limit = 100): Promise<AuditEvent[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }

    return data.map(this.transformAuditEvent);
  }

  /**
   * Get security events
   */
  async getSecurityEvents(severity?: 'high' | 'critical', limit = 100): Promise<AuditEvent[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .in('event_type', [
        AuditEventType.PERMISSION_DENIED,
        AuditEventType.SUSPICIOUS_ACTIVITY,
        AuditEventType.PASSWORD_RESET
      ]);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching security events:', error);
      return [];
    }

    return data.map(this.transformAuditEvent);
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(startDate: Date, endDate: Date): Promise<AuditEvent[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error exporting audit logs:', error);
      return [];
    }

    return data.map(this.transformAuditEvent);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      // Batch insert events
      const { error } = await supabase
        .from('audit_logs')
        .insert(events.map(event => ({
          id: event.id,
          user_id: event.userId,
          event_type: event.eventType,
          resource_type: event.resourceType,
          resource_id: event.resourceId,
          action: event.action,
          details: event.details,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          session_id: event.sessionId,
          timestamp: event.timestamp.toISOString(),
          severity: event.severity
        })));

      if (error) {
        console.error('Error batch inserting audit events:', error);
        // Re-queue failed events
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.error('Error processing audit queue:', error);
    } finally {
      this.isProcessing = false;

      // Process remaining events
      if (this.eventQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  private async logImmediately(event: AuditEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          id: event.id,
          user_id: event.userId,
          event_type: event.eventType,
          resource_type: event.resourceType,
          resource_id: event.resourceId,
          action: event.action,
          details: event.details,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          session_id: event.sessionId,
          timestamp: event.timestamp.toISOString(),
          severity: event.severity
        });

      if (error) {
        console.error('Error logging critical audit event:', error);
      }
    } catch (error) {
      console.error('Error in immediate audit logging:', error);
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(req?: any): string {
    if (!req) return '';

    return (
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      ''
    ).split(',')[0].trim();
  }

  private getUserAgent(req?: any): string {
    return req?.headers['user-agent'] || '';
  }

  private transformAuditEvent(row: any): AuditEvent {
    return {
      id: row.id,
      userId: row.user_id,
      eventType: row.event_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      action: row.action,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      sessionId: row.session_id,
      timestamp: new Date(row.timestamp),
      severity: row.severity
    };
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();