import { useState } from 'react';
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
      const errorMsg = 'Error al cargar las áreas';
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
      toast.error('Usuario no autenticado');
      return null;
    }

    setLoading(true);
    try {
      const newArea = await areasApi.create(user.id, data);
      toast.success('Área creada exitosamente');
      await fetchAreas();
      return newArea;
    } catch (err) {
      toast.error('Error al crear el área');
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
      toast.error('Usuario no autenticado');
      return null;
    }

    setLoading(true);
    try {
      const updated = await areasApi.update(id, user.id, data);
      toast.success('Área actualizada exitosamente');
      await fetchAreas();
      return updated;
    } catch (err) {
      toast.error('Error al actualizar el área');
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
      toast.success('Área eliminada exitosamente');
      await fetchAreas();
      return true;
    } catch (err) {
      toast.error('Error al eliminar el área');
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
