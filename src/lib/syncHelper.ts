/**
 * Sync Helper Utility
 *
 * Provides background sync operations that can be called from anywhere in the app.
 * These functions trigger sync operations silently without blocking the UI.
 */

import { syncApi } from './api';
import { syncEvents } from './syncEvents';

/**
 * Silently push data to cloud in the background
 * Only runs if sync is configured and enabled
 */
export async function backgroundPush(sessionToken: string): Promise<void> {
  try {
    // Check if sync is configured
    const status = await syncApi.getStatus(sessionToken);

    if (!status.configured || !status.enabled) {
      // Sync not configured or disabled - skip silently
      return;
    }

    console.log('[BackgroundPush] Starting push to cloud...');
    const result = await syncApi.push(sessionToken);

    if (result.success) {
      console.log(`[BackgroundPush] Success: ${result.recordsPushed} records pushed`);
    } else {
      console.warn('[BackgroundPush] Completed with errors:', result.errors);
    }
  } catch (error) {
    // Silent failure - don't disrupt user experience
    console.error('[BackgroundPush] Error:', error);
  }
}

/**
 * Silently pull data from cloud in the background
 * Only runs if sync is configured and enabled
 */
export async function backgroundPull(sessionToken: string): Promise<void> {
  try {
    // Check if sync is configured
    const status = await syncApi.getStatus(sessionToken);

    if (!status.configured || !status.enabled) {
      // Sync not configured or disabled - skip silently
      return;
    }

    console.log('[BackgroundPull] Starting pull from cloud...');
    const result = await syncApi.pull(sessionToken);

    if (result.success) {
      console.log(`[BackgroundPull] Success: ${result.recordsPulled} records pulled`);

      // Notify listeners that new data is available
      if (result.recordsPulled > 0) {
        syncEvents.emit();
      }
    } else {
      console.warn('[BackgroundPull] Completed with errors:', result.errors);
    }
  } catch (error) {
    // Silent failure - don't disrupt user experience
    console.error('[BackgroundPull] Error:', error);
  }
}

/**
 * Silently perform full sync (push + pull) in the background
 * Only runs if sync is configured and enabled
 */
export async function backgroundFullSync(sessionToken: string): Promise<void> {
  try {
    // Check if sync is configured
    const status = await syncApi.getStatus(sessionToken);

    if (!status.configured || !status.enabled) {
      // Sync not configured or disabled - skip silently
      return;
    }

    console.log('[BackgroundSync] Starting full sync...');
    const result = await syncApi.fullSync(sessionToken);

    if (result.success) {
      console.log(`[BackgroundSync] Success: ${result.recordsPushed} pushed, ${result.recordsPulled} pulled`);

      // Notify listeners that new data is available
      if (result.recordsPulled > 0) {
        syncEvents.emit();
      }
    } else {
      console.warn('[BackgroundSync] Completed with errors:', result.errors);
    }
  } catch (error) {
    // Silent failure - don't disrupt user experience
    console.error('[BackgroundSync] Error:', error);
  }
}
