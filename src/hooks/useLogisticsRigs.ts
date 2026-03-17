import { useEffect, useCallback, useState } from 'react';
import { rigsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useLogisticsStore } from '@/store/logisticsStore';
import { useConnectionStore } from '@/store/connectionStore';
import { syncEvents } from '@/lib/syncEvents';
import type { RigWithArea } from '@/types/rig';

interface UseLogisticsRigsReturn {
  accessibleRigs: RigWithArea[];
  selectedRigId: string | null;
  selectedRigName: string | null;
  loading: boolean;
  setSelectedRig: (rigId: string, rigName: string) => void;
  refresh: () => Promise<void>;
}

export function useLogisticsRigs(): UseLogisticsRigsReturn {
  const { sessionToken } = useAuthStore();
  const { selectedRigId, selectedRigName, setSelectedRig, clearSelectedRig } = useLogisticsStore();
  // lastPullAt cambia cada vez que llega un pull exitoso — fuerza re-fetch reactivo
  const lastPullAt = useConnectionStore((s) => s.lastPullAt);

  const [accessibleRigs, setAccessibleRigs] = useState<RigWithArea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRigs = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rigs = await rigsApi.listAccessible(sessionToken);
      setAccessibleRigs(rigs);

      if (rigs.length === 1) {
        setSelectedRig(rigs[0].id, rigs[0].name);
      } else if (rigs.length === 0) {
        clearSelectedRig();
      } else if (selectedRigId) {
        const stillAccessible = rigs.some((r) => r.id === selectedRigId);
        if (!stillAccessible) clearSelectedRig();
      }
    } catch (error) {
      console.error('Error loading accessible rigs:', error);
      setAccessibleRigs([]);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  // Re-fetch cuando monta, cuando cambia el token, o cuando llega un pull
  useEffect(() => {
    fetchRigs();
  }, [fetchRigs, lastPullAt]);

  // Re-fetch cuando cualquier sync completa (auto-sync, manual, pull)
  useEffect(() => {
    return syncEvents.subscribe(() => { fetchRigs(); });
  }, [fetchRigs]);

  const validatedRigId = loading ? null : selectedRigId;
  const validatedRigName = loading ? null : selectedRigName;

  return {
    accessibleRigs,
    selectedRigId: validatedRigId,
    selectedRigName: validatedRigName,
    loading,
    setSelectedRig,
    refresh: fetchRigs,
  };
}
