import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { rigsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { RigWithArea, CreateRigInput, UpdateRigInput } from '@/types/rig';

interface UseRigsReturn {
  rigs: RigWithArea[];
  loading: boolean;
  error: string | null;
  fetchRigs: (includeInactive?: boolean) => Promise<void>;
  createRig: (data: CreateRigInput) => Promise<RigWithArea | null>;
  updateRig: (id: string, data: UpdateRigInput) => Promise<RigWithArea | null>;
  deleteRig: (id: string) => Promise<boolean>;
}

export function useRigs(): UseRigsReturn {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [rigs, setRigs] = useState<RigWithArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch rigs
  const fetchRigs = async (includeInactive: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await rigsApi.list(includeInactive);
      setRigs(data);
    } catch (err) {
      const errorMsg = t('admin.rigs.loadRigsError');
      setError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create rig
  const createRig = async (data: CreateRigInput): Promise<RigWithArea | null> => {
    if (!user?.id) {
      toast.error(t('errors.notAuthenticated'));
      return null;
    }

    setLoading(true);
    try {
      const newRig = await rigsApi.create(user.id, data);
      toast.success(t('admin.rigs.created'));
      await fetchRigs();
      return newRig;
    } catch (err) {
      toast.error(t('admin.rigs.createError'));
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update rig
  const updateRig = async (
    id: string,
    data: UpdateRigInput
  ): Promise<RigWithArea | null> => {
    if (!user?.id) {
      toast.error(t('errors.notAuthenticated'));
      return null;
    }

    setLoading(true);
    try {
      const updated = await rigsApi.update(id, user.id, data);
      toast.success(t('admin.rigs.updated'));
      await fetchRigs();
      return updated;
    } catch (err) {
      toast.error(t('admin.rigs.updateError'));
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete rig
  const deleteRig = async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      await rigsApi.delete(id);
      toast.success(t('admin.rigs.deleted'));
      await fetchRigs();
      return true;
    } catch (err) {
      toast.error(t('admin.rigs.deleteError'));
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    rigs,
    loading,
    error,
    fetchRigs,
    createRig,
    updateRig,
    deleteRig,
  };
}
