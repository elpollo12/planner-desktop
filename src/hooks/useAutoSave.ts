import { useEffect, useRef, useCallback, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  /** Data to auto-save */
  data: T;
  /** Key for localStorage */
  storageKey: string;
  /** Debounce delay in milliseconds (default: 2000) */
  debounceMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Callback when data is saved */
  onSave?: (data: T) => void;
  /** Callback on save error */
  onError?: (error: Error) => void;
  /** Optional async save function (e.g., to backend) */
  saveToBackend?: (data: T) => Promise<void>;
  /** Whether to also save to backend (default: false) */
  syncToBackend?: boolean;
}

interface UseAutoSaveReturn<T> {
  /** Current save status */
  status: AutoSaveStatus;
  /** Timestamp of last successful save */
  lastSaved: Date | null;
  /** Force save now (bypasses debounce) */
  saveNow: () => void;
  /** Clear saved data from storage */
  clearSaved: () => void;
  /** Load data from storage */
  loadFromStorage: () => T | null;
  /** Error message if status is 'error' */
  error: string | null;
}

export function useAutoSave<T>({
  data,
  storageKey,
  debounceMs = 2000,
  enabled = true,
  onSave,
  onError,
  saveToBackend,
  syncToBackend = false,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<string>('');
  const isMountedRef = useRef(true);

  // Serialize data for comparison
  const serializedData = JSON.stringify(data);

  // Save to localStorage
  const saveToStorage = useCallback((dataToSave: T) => {
    try {
      const savePayload = {
        data: dataToSave,
        timestamp: new Date().toISOString(),
        version: 1,
      };
      localStorage.setItem(storageKey, JSON.stringify(savePayload));
      return true;
    } catch (err) {
      console.error('Error saving to localStorage:', err);
      return false;
    }
  }, [storageKey]);

  // Main save function
  const performSave = useCallback(async () => {
    if (!isMountedRef.current) return;

    setStatus('saving');
    setError(null);

    try {
      // Always save to localStorage
      const localSaved = saveToStorage(data);

      if (!localSaved) {
        throw new Error('Failed to save to local storage');
      }

      // Optionally sync to backend
      if (syncToBackend && saveToBackend) {
        await saveToBackend(data);
      }

      if (isMountedRef.current) {
        setStatus('saved');
        setLastSaved(new Date());
        onSave?.(data);
      }

      // Reset status after delay
      setTimeout(() => {
        if (isMountedRef.current) {
          setStatus('idle');
        }
      }, 3000);

    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setStatus('error');
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [data, saveToStorage, syncToBackend, saveToBackend, onSave, onError]);

  // Force save now
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    performSave();
  }, [performSave]);

  // Clear saved data
  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setLastSaved(null);
      setStatus('idle');
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
  }, [storageKey]);

  // Load from storage
  const loadFromStorage = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      return parsed.data as T;
    } catch (err) {
      console.error('Error loading from localStorage:', err);
      return null;
    }
  }, [storageKey]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!enabled) return;

    // Check if data has actually changed
    if (serializedData === previousDataRef.current) {
      return;
    }

    // Skip first render (no changes yet)
    if (previousDataRef.current === '') {
      previousDataRef.current = serializedData;
      return;
    }

    previousDataRef.current = serializedData;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [serializedData, enabled, debounceMs, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'saving' || serializedData !== previousDataRef.current) {
        // Try to save synchronously
        saveToStorage(data);
        e.preventDefault();
        e.returnValue = 'Hay cambios sin guardar. ¿Desea salir?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status, serializedData, data, saveToStorage]);

  return {
    status,
    lastSaved,
    saveNow,
    clearSaved,
    loadFromStorage,
    error,
  };
}

// Helper to check if there's a saved draft
export function hasSavedDraft(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
}

// Helper to get draft timestamp
export function getDraftTimestamp(storageKey: string): Date | null {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed.timestamp ? new Date(parsed.timestamp) : null;
  } catch {
    return null;
  }
}
