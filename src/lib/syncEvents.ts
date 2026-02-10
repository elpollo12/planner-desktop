/**
 * Sync Events System
 *
 * Simple event emitter for sync-related events.
 * Allows components to listen for sync completion and refresh their data.
 */

type SyncEventHandler = () => void;

class SyncEventEmitter {
  private listeners: Set<SyncEventHandler> = new Set();

  /**
   * Subscribe to sync completion events
   * Returns an unsubscribe function
   */
  subscribe(handler: SyncEventHandler): () => void {
    this.listeners.add(handler);

    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Emit a sync completion event to all listeners
   */
  emit(): void {
    this.listeners.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('[SyncEvents] Error in listener:', error);
      }
    });
  }
}

// Global singleton instance
export const syncEvents = new SyncEventEmitter();
