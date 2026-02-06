import { create } from 'zustand';
import { operatorsApi } from '../lib/api';
import type { Operator, CreateOperatorInput, UpdateOperatorInput } from '../types/operator';

interface OperatorLogos {
  [operatorId: string]: string | null;
}

interface OperatorsState {
  operators: Operator[];
  operatorLogos: OperatorLogos;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadOperators: (sessionToken: string, onlyActive?: boolean) => Promise<void>;
  createOperator: (sessionToken: string, input: CreateOperatorInput) => Promise<Operator>;
  updateOperator: (sessionToken: string, operatorId: string, input: UpdateOperatorInput) => Promise<Operator>;
  deleteOperator: (sessionToken: string, operatorId: string) => Promise<void>;
  uploadLogo: (sessionToken: string, operatorId: string, file: File) => Promise<void>;
  removeLogo: (sessionToken: string, operatorId: string) => Promise<void>;
  loadOperatorLogo: (sessionToken: string, operatorId: string) => Promise<void>;
  clearOperators: () => void;
}

export const useOperatorsStore = create<OperatorsState>()((set, get) => ({
  operators: [],
  operatorLogos: {},
  isLoading: false,
  error: null,

  loadOperators: async (sessionToken: string, onlyActive = true) => {
    set({ isLoading: true, error: null });
    try {
      const operators = await operatorsApi.list(sessionToken, onlyActive);
      set({ operators, isLoading: false });

      // Load logos for all operators in background
      for (const op of operators) {
        if (op.logoPath) {
          get().loadOperatorLogo(sessionToken, op.id);
        }
      }
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  createOperator: async (sessionToken: string, input: CreateOperatorInput) => {
    set({ isLoading: true, error: null });
    try {
      const operator = await operatorsApi.create(sessionToken, input);
      set((state) => ({
        operators: [...state.operators, operator].sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));
      return operator;
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  updateOperator: async (sessionToken: string, operatorId: string, input: UpdateOperatorInput) => {
    set({ isLoading: true, error: null });
    try {
      const operator = await operatorsApi.update(sessionToken, operatorId, input);
      set((state) => ({
        operators: state.operators
          .map((o) => (o.id === operatorId ? operator : o))
          .sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));
      return operator;
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  deleteOperator: async (sessionToken: string, operatorId: string) => {
    set({ isLoading: true, error: null });
    try {
      await operatorsApi.delete(sessionToken, operatorId);
      set((state) => ({
        operators: state.operators.filter((o) => o.id !== operatorId),
        operatorLogos: { ...state.operatorLogos, [operatorId]: null },
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  uploadLogo: async (sessionToken: string, operatorId: string, file: File) => {
    const buffer = await file.arrayBuffer();
    const fileData = Array.from(new Uint8Array(buffer));
    const operator = await operatorsApi.uploadLogo(sessionToken, operatorId, fileData, file.name);

    // Update operator and reload logo
    set((state) => ({
      operators: state.operators.map((o) => (o.id === operatorId ? operator : o)),
    }));

    // Reload logo data
    await get().loadOperatorLogo(sessionToken, operatorId);
  },

  removeLogo: async (sessionToken: string, operatorId: string) => {
    const operator = await operatorsApi.removeLogo(sessionToken, operatorId);
    set((state) => ({
      operators: state.operators.map((o) => (o.id === operatorId ? operator : o)),
      operatorLogos: { ...state.operatorLogos, [operatorId]: null },
    }));
  },

  loadOperatorLogo: async (sessionToken: string, operatorId: string) => {
    try {
      const logoData = await operatorsApi.getLogoData(sessionToken, operatorId);
      set((state) => ({
        operatorLogos: { ...state.operatorLogos, [operatorId]: logoData },
      }));
    } catch (error) {
      console.error(`Failed to load logo for operator ${operatorId}:`, error);
    }
  },

  clearOperators: () => {
    set({ operators: [], operatorLogos: {}, isLoading: false, error: null });
  },
}));
