import { invoke } from '@tauri-apps/api/core';
import type { User, LoginResponse } from '../../types/user';

// ============================================================================
// Authentication Commands
// ============================================================================

export const authApi = {
  login: (username: string, password: string) =>
    invoke<LoginResponse>('login', { username, password }),

  logout: (sessionToken: string) =>
    invoke<void>('logout', { sessionToken }),

  getCurrentUser: (sessionToken: string) =>
    invoke<User>('get_current_user', { sessionToken }),
};
