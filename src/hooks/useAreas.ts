import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { areasApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Area, CreateAreaInput, UpdateAreaInput } from '@/types/rig';

interface UseAreasReturn {
  areas: Area[];
  loading: boolean;
  error: string | null;
  fetchAreas: (includeInactive?: boolean) => Promise<void>;
  createArea: (data: CreateAreaInput) => Promise<Area | null>;
  updateArea: (id: string, data: UpdateAreaInput) => Promise<Area | null>;
  deleteArea: (id: string) => Promise<boolean>;
}

export function useAreas(): UseAreasReturn {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch areas
  const fetchAreas = async (includeInactive: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await areasApi.list(includeInactive);
      setAreas(data);
    } catch (err) {
      const errorMsg = t('admin.areas.loadError');
      setError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create area
  const createArea = async (data: CreateAreaInput): Promise<Area | null> => {
    if (!user?.id) {
      toast.error(t('errors.notAuthenticated'));
      return null;
    }

    setLoading(true);
    try {
      const newArea = await areasApi.create(user.id, data);
      toast.success(t('admin.areas.created'));
      await fetchAreas();
      return newArea;
    } catch (err) {
      toast.error(t('admin.areas.createError'));
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update area
  const updateArea = async (
    id: string,
    data: UpdateAreaInput
  ): Promise<Area | null> => {
    if (!user?.id) {
      toast.error(t('errors.notAuthenticated'));
      return null;
    }

    setLoading(true);
    try {
      const updated = await areasApi.update(id, user.id, data);
      toast.success(t('admin.areas.updated'));
      await fetchAreas();
      return updated;
    } catch (err) {
      toast.error(t('admin.areas.updateError'));
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete area
  const deleteArea = async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      await areasApi.delete(id);
      toast.success(t('admin.areas.deleted'));
      await fetchAreas();
      return true;
    } catch (err) {
      toast.error(t('admin.areas.deleteError'));
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    areas,
    loading,
    error,
    fetchAreas,
    createArea,
    updateArea,
    deleteArea,
  };
}
