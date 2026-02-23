import { useState } from 'react';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';
import { AlertTriangle, PackageOpen } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { useIncidentsRigs } from '../hooks/useIncidentsRigs';
import { RigSelector } from '../components/logistics/RigSelector';
import { IncidentsList } from '../components/incidents/IncidentsList';

export default function IncidentsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    accessibleRigs,
    selectedRigId,
    selectedRigName,
    loading: rigsLoading,
    setSelectedRig,
  } = useIncidentsRigs();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout title="Incidencias" subtitle="Registro de incidencias por taladro">
      {/* Rig Selector */}
      <div className="mb-4">
        <RigSelector
          rigs={accessibleRigs}
          selectedRigId={selectedRigId}
          selectedRigName={selectedRigName}
          loading={rigsLoading}
          onSelect={setSelectedRig}
        />
      </div>

      {/* Prompt to select rig */}
      {!rigsLoading && !selectedRigId && accessibleRigs.length > 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
              Selecciona un taladro para gestionar incidencias
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Elige un taladro en el selector de arriba para ver y crear incidencias
            </p>
          </div>
        </Card>
      )}

      {/* Content */}
      {selectedRigId && (
        <Card>
          <IncidentsList rigId={selectedRigId} rigName={selectedRigName} />
        </Card>
      )}
    </MainLayout>
  );
}
