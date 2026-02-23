import { useState, useEffect, useCallback } from 'react';
import { rigsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useIncidentsStore } from '@/store/incidentsStore';
import type { RigWithArea } from '@/types/rig';

interface UseIncidentsRigsReturn {
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

export function useIncidentsRigs(): UseIncidentsRigsReturn {
  const { sessionToken } = useAuthStore();
  const { selectedRigId, selectedRigName, setSelectedRig, clearSelectedRig } = useIncidentsStore();

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
        setSelectedRig(rigs[0].id, rigs[0].name);
      } else if (rigs.length === 0) {
        clearSelectedRig();
      } else if (selectedRigId) {
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
