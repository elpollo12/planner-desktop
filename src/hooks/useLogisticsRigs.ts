import { useState, useEffect, useCallback } from 'react';
import { rigsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useLogisticsStore } from '@/store/logisticsStore';
import type { RigWithArea } from '@/types/rig';

interface UseLogisticsRigsReturn {
  /** Rigs the current user has access to */
  accessibleRigs: RigWithArea[];
  /** Currently selected rig ID */
  selectedRigId: string | null;
  /** Currently selected rig name */
  selectedRigName: string | null;
  /** Whether the rig list is loading */
  loading: boolean;
  /** Select a rig as active context */
  setSelectedRig: (rigId: string, rigName: string) => void;
  /** Refresh the list of accessible rigs */
  refresh: () => Promise<void>;
}

export function useLogisticsRigs(): UseLogisticsRigsReturn {
  const { sessionToken } = useAuthStore();
  const { selectedRigId, selectedRigName, setSelectedRig, clearSelectedRig } = useLogisticsStore();

  const [accessibleRigs, setAccessibleRigs] = useState<RigWithArea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRigs = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const rigs = await rigsApi.listAccessible(sessionToken);
      setAccessibleRigs(rigs);

      // Auto-select logic
      if (rigs.length === 1) {
        // Only one rig available — auto-select it
        setSelectedRig(rigs[0].id, rigs[0].name);
      } else if (rigs.length === 0) {
        // No rigs — clear any stale selection
        clearSelectedRig();
      } else if (selectedRigId) {
        // Multiple rigs — validate that the persisted selection is still accessible
        const stillAccessible = rigs.some((r) => r.id === selectedRigId);
        if (!stillAccessible) {
          clearSelectedRig();
        }
      }
    } catch (error) {
      console.error('Error loading accessible rigs:', error);
      setAccessibleRigs([]);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchRigs();
  }, [fetchRigs]);

  // While loading, don't expose the persisted rigId — it may be stale
  // (e.g. user switched accounts). Only expose after validation.
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
