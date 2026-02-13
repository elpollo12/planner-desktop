import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LogisticsState {
  /** Currently selected rig ID for logistics operations */
  selectedRigId: string | null;
  /** Human-readable name of the selected rig */
  selectedRigName: string | null;
  /** Set the active rig context */
  setSelectedRig: (rigId: string, rigName: string) => void;
  /** Clear the rig selection */
  clearSelectedRig: () => void;
}

export const useLogisticsStore = create<LogisticsState>()(
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
      name: 'logistics-store',
      partialize: (state) => ({
        selectedRigId: state.selectedRigId,
        selectedRigName: state.selectedRigName,
      }),
    }
  )
);
