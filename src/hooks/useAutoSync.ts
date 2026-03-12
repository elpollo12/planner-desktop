import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useConnectionStore } from '../store/connectionStore';
import { syncApi } from '../lib/api';
import { syncEvents } from '../lib/syncEvents';
import type { SyncStatus } from '../types/sync';

/**
 * Intervalo fijo del ticker en ms. Determina la granularidad mínima del autosync.
 * El sync real solo ocurre cuando se cumple syncIntervalMinutes del servidor.
 */
const TICK_INTERVAL_MS = 60 * 1000; // 60 segundos

/**
 * Tiempo de espera inicial antes del primer sync tras el login.
 * Suficiente para que el handshake termine antes de que autosync empiece.
 */
const INITIAL_DELAY_MS = 12 * 1000; // 12 segundos

/**
 * Tiempo de validez del SyncStatus cacheado.
 * getStatus lee sync_config.json del disco — se cachea para evitar lecturas
 * innecesarias en ticks donde el intervalo claramente no se ha cumplido.
 */
const STATUS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Hook que sincroniza automáticamente con planner-sync al intervalo configurado.
 * Corre en background mientras la app esté abierta y el usuario autenticado.
 *
 * Todos los usuarios autenticados hacen pull automático para recibir datos
 * de otros clientes (reportes, logistics, etc.).
 *
 * Optimizaciones:
 * - Cachea SyncStatus para no leer disco en cada tick cuando el intervalo no se cumplió
 * - Initial delay de 12s para no solaparse con el handshake de licencia
 * - Guard anti-concurrencia (isSyncingRef) evita syncs simultáneos
 * - Timestamps avanzados solo en el backend si la operación fue exitosa
 */
export function useAutoSync() {
  const { sessionToken, isAuthenticated } = useAuthStore();
  const { setOnline, setOffline, setSyncing, setError, setSyncEnabled } = useConnectionStore();
  const intervalRef = useRef<number | null>(null);
  const initialTimeoutRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  // Cache de SyncStatus para evitar lecturas de disco redundantes
  const cachedStatusRef = useRef<{ status: SyncStatus; fetchedAt: number } | null>(null);

  const getStatusCached = useCallback(async (token: string): Promise<SyncStatus> => {
    const now = Date.now();
    const cached = cachedStatusRef.current;
    if (cached && now - cached.fetchedAt < STATUS_CACHE_TTL_MS) {
      return cached.status;
    }
    const status = await syncApi.getStatus(token);
    cachedStatusRef.current = { status, fetchedAt: now };
    return status;
  }, []);

  const doSync = useCallback(async () => {
    if (!sessionToken) return;
    if (isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;

      const syncStatus = await getStatusCached(sessionToken);
      setSyncEnabled(syncStatus.configured, syncStatus.enabled);

      if (!syncStatus.configured || !syncStatus.enabled || syncStatus.syncIntervalMinutes === 0) {
        return;
      }

      const intervalMs = syncStatus.syncIntervalMinutes * 60 * 1000;
      const now = Date.now();

      if (now - lastSyncRef.current < intervalMs) {
        return;
      }

      // Invalidar cache antes del sync — el status puede cambiar tras la operación
      cachedStatusRef.current = null;

      setSyncing();
      console.log('[AutoSync] Iniciando sync incremental...');

      const result = await syncApi.incrementalSync(sessionToken);
      lastSyncRef.current = now;

      if (result.success) {
        console.log(`[AutoSync] OK: ${result.recordsPushed} enviados, ${result.recordsPulled} recibidos`);
        setOnline();
      } else {
        console.warn('[AutoSync] Completado con errores:', result.errors);
        if (result.errors.length > 0) {
          setError(result.errors[0]);
        } else {
          setOnline();
        }
      }

      if (result.success || result.recordsPulled > 0) {
        syncEvents.emit();
      }
    } catch (error: any) {
      console.error('[AutoSync] Error:', error);
      cachedStatusRef.current = null; // Limpiar cache en error para reintentar getStatus
      setOffline(error?.message || 'Error de conexión');
    } finally {
      isSyncingRef.current = false;
    }
  }, [sessionToken, getStatusCached, setOnline, setOffline, setSyncing, setError, setSyncEnabled]);

  useEffect(() => {
    if (!isAuthenticated || !sessionToken) {
      return;
    }

    // Resetear cache al iniciar sesión para forzar lectura fresca del estado
    cachedStatusRef.current = null;
    lastSyncRef.current = 0;

    // Sync inicial con delay para no solaparse con el handshake de licencia
    initialTimeoutRef.current = window.setTimeout(() => {
      doSync();
    }, INITIAL_DELAY_MS);

    // Ticker periódico
    intervalRef.current = window.setInterval(() => {
      doSync();
    }, TICK_INTERVAL_MS);

    return () => {
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
        initialTimeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, sessionToken, doSync]);
}
