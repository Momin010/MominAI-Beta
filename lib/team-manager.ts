/**
 * Team Management System
 * Enterprise team workspaces with role-based access
 */

import { createClient } from '@supabase/supabase-js';
import { auditLogger, AuditEventType } from './audit-logger';
import { UserRole, Permission, AccessControl } from './auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  avatar?: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: UserRole;
  joinedAt: Date;
  invitedBy: string;
  status: 'active' | 'pending' | 'inactive';
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  createdAt: Date;
}

export class TeamManager {
  /**
   * Create a new team
   */
  async createTeam(ownerId: string, name: string, description?: string): Promise<Team> {
    // Check if user can create teams (basic validation)
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', ownerId)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name,
        description,
        owner_id: ownerId,
        settings: {
          allowPublicProjects: false,
          requireApprovalForJoins: true,
          defaultMemberRole: UserRole.DEVELOPER
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create team: ${error.message}`);
    }

    // Add owner as team member
    await this.addTeamMember(team.id, ownerId, UserRole.OWNER, ownerId);

    // Audit log
    await auditLogger.logTeam(AuditEventType.TEAM_CREATED, ownerId, team.id, {
      teamName: name,
      description
    });

    return this.transformTeam(team);
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error || !team) {
      return null;
    }

    return this.transformTeam(team);
  }

  /**
   * Get user's teams
   */
  async getUserTeams(userId: string): Promise<Team[]> {
    const { data: memberships, error } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to get user teams: ${error.message}`);
    }

    return memberships.map(m => this.transformTeam(m.teams));
  }

  /**
   * Update team
   */
  async updateTeam(teamId: string, userId: string, updates: Partial<Team>): Promise<Team> {
    // Check permissions
    const member = await this.getTeamMember(teamId, userId);
    if (!member || !AccessControl.hasPermission(member, Permission.MANAGE_TEAM)) {
      throw new Error('Insufficient permissions to update team');
    }

    const { data: team, error } = await supabase
      .from('teams')
      .update({
        name: updates.name,
        description: updates.description,
        avatar: updates.avatar,
        settings: updates.settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update team: ${error.message}`);
    }

    // Audit log
    await auditLogger.logTeam(AuditEventType.TEAM_UPDATED, userId, teamId, updates);

    return this.transformTeam(team);
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string, userId: string): Promise<void> {
    // Check permissions
    const member = await this.getTeamMember(teamId, userId);
    if (!member || !AccessControl.isOwner(member)) {
      throw new Error('Only team owner can delete team');
    }

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      throw new Error(`Failed to delete team: ${error.message}`);
    }

    // Audit log
    await auditLogger.logTeam(AuditEventType.TEAM_DELETED, userId, teamId, {});
  }

  /**
   * Add team member
   */
  async addTeamMember(teamId: string, userId: string, role: UserRole, invitedBy: string): Promise<TeamMember> {
    // Check if user is already a member
    const existingMember = await this.getTeamMember(teamId, userId);
    if (existingMember) {
      throw new Error('User is already a team member');
    }

    const { data: member, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
        invited_by: invitedBy,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add team member: ${error.message}`);
    }

    // Update user's team_id
    await supabase
      .from('users')
      .update({ team_id: teamId })
      .eq('id', userId);

    // Audit log
    await auditLogger.logTeam(AuditEventType.MEMBER_JOINED, invitedBy, teamId, {
      newMemberId: userId,
      role
    });

    return this.transformTeamMember(member);
  }

  /**
   * Invite user to team
   */
  async inviteUser(teamId: string, email: string, role: UserRole, invitedBy: string): Promise<TeamInvitation> {
    // Check permissions
    const member = await this.getTeamMember(teamId, invitedBy);
    if (!member || !AccessControl.hasPermission(member, Permission.INVITE_MEMBERS)) {
      throw new Error('Insufficient permissions to invite members');
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Add directly if user exists
      await this.addTeamMember(teamId, existingUser.id, role, invitedBy);
      // Return a mock invitation object for consistency
      return {
        id: `inv_${Date.now()}`,
        teamId,
        email,
        role,
        invitedBy,
        token: '',
        expiresAt: new Date(),
        status: 'accepted' as const,
        createdAt: new Date()
      };
    }

    // Create invitation
    const token = this.generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email,
        role,
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create invitation: ${error.message}`);
    }

    // TODO: Send invitation email
    // await this.sendInvitationEmail(email, invitation);

    // Audit log
    await auditLogger.logTeam(AuditEventType.MEMBER_INVITED, invitedBy, teamId, {
      email,
      role
    });

    return this.transformInvitation(invitation);
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<TeamMember> {
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Check if user email matches invitation
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user || user.email !== invitation.email) {
      throw new Error('Invitation email does not match user email');
    }

    // Update invitation status
    await supabase
      .from('team_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    // Add user to team
    return await this.addTeamMember(invitation.team_id, userId, invitation.role, invitation.invited_by);
  }

  /**
   * Remove team member
   */
  async removeMember(teamId: string, memberId: string, removedBy: string): Promise<void> {
    // Check permissions
    const remover = await this.getTeamMember(teamId, removedBy);
    if (!remover || !AccessControl.hasPermission(remover, Permission.REMOVE_MEMBERS)) {
      throw new Error('Insufficient permissions to remove members');
    }

    // Cannot remove owner
    const member = await this.getTeamMember(teamId, memberId);
    if (member?.role === UserRole.OWNER) {
      throw new Error('Cannot remove team owner');
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberId);

    if (error) {
      throw new Error(`Failed to remove team member: ${error.message}`);
    }

    // Update user's team_id
    await supabase
      .from('users')
      .update({ team_id: null })
      .eq('id', memberId);

    // Audit log
    await auditLogger.logTeam(AuditEventType.MEMBER_REMOVED, removedBy, teamId, {
      removedMemberId: memberId
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(teamId: string, memberId: string, newRole: UserRole, updatedBy: string): Promise<TeamMember> {
    // Check permissions
    const updater = await this.getTeamMember(teamId, updatedBy);
    if (!updater || !AccessControl.hasPermission(updater, Permission.MANAGE_TEAM)) {
      throw new Error('Insufficient permissions to update member roles');
    }

    // Cannot change owner's role
    const member = await this.getTeamMember(teamId, memberId);
    if (member?.role === UserRole.OWNER) {
      throw new Error('Cannot change team owner role');
    }

    const { data: updatedMember, error } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('team_id', teamId)
      .eq('user_id', memberId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update member role: ${error.message}`);
    }

    // Audit log
    await auditLogger.logTeam(AuditEventType.MEMBER_ROLE_CHANGED, updatedBy, teamId, {
      memberId,
      oldRole: member?.role,
      newRole
    });

    return this.transformTeamMember(updatedMember);
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data: members, error } = await supabase
      .from('team_members')
      .select(`
        *,
        users (id, name, email, avatar)
      `)
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to get team members: ${error.message}`);
    }

    return members.map(m => this.transformTeamMember(m));
  }

  /**
   * Get team member
   */
  async getTeamMember(teamId: string, userId: string): Promise<TeamMember | null> {
    const { data: member, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !member) {
      return null;
    }

    return this.transformTeamMember(member);
  }

  /**
   * Get pending invitations
   */
  async getPendingInvitations(teamId: string): Promise<TeamInvitation[]> {
    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      throw new Error(`Failed to get pending invitations: ${error.message}`);
    }

    return invitations.map(i => this.transformInvitation(i));
  }

  private generateInvitationToken(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private transformTeam(team: any): Team {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      ownerId: team.owner_id,
      avatar: team.avatar,
      settings: team.settings || {},
      createdAt: new Date(team.created_at),
      updatedAt: new Date(team.updated_at)
    };
  }

  private transformTeamMember(member: any): TeamMember {
    return {
      id: member.id,
      teamId: member.team_id,
      userId: member.user_id,
      role: member.role,
      joinedAt: new Date(member.joined_at || member.created_at),
      invitedBy: member.invited_by,
      status: member.status
    };
  }

  private transformInvitation(invitation: any): TeamInvitation {
    return {
      id: invitation.id,
      teamId: invitation.team_id,
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invited_by,
      token: invitation.token,
      expiresAt: new Date(invitation.expires_at),
      status: invitation.status,
      createdAt: new Date(invitation.created_at)
    };
  }
}

export const teamManager = new TeamManager();