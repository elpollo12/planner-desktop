import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IncidentsState {
  /** Currently selected rig ID for incidents operations */
  selectedRigId: string | null;
  /** Human-readable name of the selected rig */
  selectedRigName: string | null;
  /** Set the active rig context */
  setSelectedRig: (rigId: string, rigName: string) => void;
  /** Clear the rig selection */
  clearSelectedRig: () => void;
}

export const useIncidentsStore = create<IncidentsState>()(
  persist(
    (set) => ({
      selectedRigId: null,
      selectedRigName: null,

      setSelectedRig: (rigId: string, rigName: string) =>
        set({ selectedRigId: rigId, selectedRigName: rigName }),

      clearSelectedRig: () =>
        set({ selectedRigId: null, selectedRigName: null }),
    }),
    {
      name: 'incidents-store',
      partialize: (state) => ({
        selectedRigId: state.selectedRigId,
        selectedRigName: state.selectedRigName,
      }),
    }
  )
);
