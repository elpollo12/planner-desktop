import { invoke } from '@tauri-apps/api/core';
import type { User, CreateUserInput, UpdateUserInput } from '../../types/user';

// ============================================================================
// User Management Commands (Admin Only)
// ============================================================================

export const usersApi = {
  create: (sessionToken: string, userData: CreateUserInput) =>
    invoke<User>('create_user', { sessionToken, userData }),

  list: (sessionToken: string) =>
    invoke<User[]>('list_users', { sessionToken }),

  get: (sessionToken: string, userId: string) =>
    invoke<User>('get_user', { sessionToken, userId }),

  update: (sessionToken: string, userId: string, userData: UpdateUserInput) =>
    invoke<User>('update_user', { sessionToken, userId, userData }),

  delete: (sessionToken: string, userId: string) =>
    invoke<void>('delete_user', { sessionToken, userId }),

  /** Admin resets a user's password (no current password required) */
  adminChangePassword: (sessionToken: string, userId: string, newPassword: string) =>
    invoke<void>('admin_change_password', { sessionToken, userId, newPassword }),

  /** Verify user's current password without changing it */
  verifyOwnPassword: (sessionToken: string, currentPassword: string) =>
    invoke<boolean>('verify_own_password', { sessionToken, currentPassword }),

  /** User changes their own password (requires current password) */
  changeOwnPassword: (sessionToken: string, currentPassword: string, newPassword: string) =>
    invoke<void>('change_own_password', { sessionToken, currentPassword, newPassword }),
};
