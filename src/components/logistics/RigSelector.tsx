import { ChevronDown, AlertTriangle, Loader2 } from 'lucide-react';
import type { RigWithArea } from '@/types/rig';
import { OilRigIcon } from '../ui/icons/OilRigIcon';

interface RigSelectorProps {
  rigs: RigWithArea[];
  selectedRigId: string | null;
  selectedRigName: string | null;
  loading: boolean;
  onSelect: (rigId: string, rigName: string) => void;
}

export function RigSelector({ rigs, selectedRigId, selectedRigName: _selectedRigName, loading, onSelect }: RigSelectorProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <Loader2 size={18} className="animate-spin text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Cargando taladros...</span>
      </div>
    );
  }

  // No rigs assigned
  if (rigs.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <AlertTriangle size={18} className="text-amber-500" />
        <span className="text-sm text-amber-700 dark:text-amber-400">
          No tienes taladros asignados. Contacta a un administrador para obtener acceso.
        </span>
      </div>
    );
  }

  // Single rig — show fixed label (no dropdown)
  if (rigs.length === 1) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <OilRigIcon size={18} className="text-gray-500 dark:text-gray-400" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Taladro:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rigs[0].name}</span>
          {rigs[0].areaName && (
            <span className="text-xs text-gray-400 dark:text-gray-500">— {rigs[0].areaName}</span>
          )}
        </div>
      </div>
    );
  }

  // Multiple rigs — dropdown selector
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <OilRigIcon size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">Taladro:</span>
      <div className="relative">
        <select
          value={selectedRigId || ''}
          onChange={(e) => {
            const rig = rigs.find((r) => r.id === e.target.value);
            if (rig) onSelect(rig.id, rig.name);
          }}
          className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-8 py-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          <option value="" disabled>
            Seleccionar taladro...
          </option>
          {rigs.map((rig) => (
            <option key={rig.id} value={rig.id}>
              {rig.name}{rig.areaName ? ` — ${rig.areaName}` : ''}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
