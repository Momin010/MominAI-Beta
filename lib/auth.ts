/**
 * Enterprise Authentication System
 * Custom auth with Supabase and enterprise features
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer'
}

export enum Permission {
  // Project permissions
  READ_PROJECT = 'read_project',
  WRITE_CODE = 'write_code',
  DELETE_PROJECT = 'delete_project',
  MANAGE_PROJECT = 'manage_project',

  // Team permissions
  MANAGE_TEAM = 'manage_team',
  INVITE_MEMBERS = 'invite_members',
  REMOVE_MEMBERS = 'remove_members',

  // Deployment permissions
  DEPLOY_PROJECT = 'deploy_project',
  MANAGE_DEPLOYMENTS = 'manage_deployments',

  // Admin permissions
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_BILLING = 'manage_billing',
  SYSTEM_ADMIN = 'system_admin'
}

export const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    Permission.READ_PROJECT,
    Permission.WRITE_CODE,
    Permission.DELETE_PROJECT,
    Permission.MANAGE_PROJECT,
    Permission.MANAGE_TEAM,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.DEPLOY_PROJECT,
    Permission.MANAGE_DEPLOYMENTS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_BILLING,
    Permission.SYSTEM_ADMIN
  ],
  [UserRole.ADMIN]: [
    Permission.READ_PROJECT,
    Permission.WRITE_CODE,
    Permission.MANAGE_PROJECT,
    Permission.MANAGE_TEAM,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.DEPLOY_PROJECT,
    Permission.MANAGE_DEPLOYMENTS,
    Permission.VIEW_ANALYTICS
  ],
  [UserRole.DEVELOPER]: [
    Permission.READ_PROJECT,
    Permission.WRITE_CODE,
    Permission.DEPLOY_PROJECT
  ],
  [UserRole.VIEWER]: [
    Permission.READ_PROJECT
  ]
};

export class AccessControl {
  static hasPermission(user: any, permission: Permission, resource?: any): boolean {
    if (!user || !user.role) return false;

    const userPermissions = rolePermissions[user.role as UserRole] || [];
    return userPermissions.includes(permission);
  }

  static hasAnyPermission(user: any, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  static hasAllPermissions(user: any, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  static isOwner(user: any): boolean {
    return user?.role === UserRole.OWNER;
  }

  static isAdmin(user: any): boolean {
    return [UserRole.OWNER, UserRole.ADMIN].includes(user?.role);
  }

  static canManageProject(user: any, project: any): boolean {
    if (this.isOwner(user)) return true;
    if (this.isAdmin(user) && project.teamId === user.teamId) return true;
    return project.ownerId === user.id;
  }
}

// Custom Authentication Service
export class AuthService {
  static async authenticateUser(email: string, password: string) {
    try {
      // Get user from Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return null;
      }

      // Simple password verification (in production, use proper hashing)
      if (password !== user.password_hash) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.team_id,
        avatar: user.avatar
      };
    } catch (error) {
      console.error('Auth error:', error);
      return null;
    }
  }

  static async createUser(email: string, name: string, password: string, role: UserRole = UserRole.DEVELOPER) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email,
          name,
          password_hash: password, // In production, hash this
          role,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      return user;
    } catch (error) {
      console.error('User creation error:', error);
      throw error;
    }
  }

  static async getUserById(userId: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    return user;
  }

  static generateToken(user: any): string {
    // Simple token generation (in production, use JWT)
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  static verifyToken(token: string): any {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      if (payload.exp < Date.now()) {
        return null; // Token expired
      }
      return payload;
    } catch (error) {
      return null;
    }
  }
}

// Export the AuthService as default
export default AuthService;