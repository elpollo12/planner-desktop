import { Eye, Calendar, User, Tag, FileText, Package, ClipboardSignature, Info } from 'lucide-react';
import { useModal } from '../../store/modalStore';
import { Button } from '../ui';
import { formatDateDMY, formatTimeHM } from '../../lib/dateUtils';

interface DetailField {
  label: string;
  value: string;
  icon: React.ElementType;
}

interface MovementDetailModalProps {
  fields: DetailField[];
}

export default function MovementDetailModal({ fields }: MovementDetailModalProps) {
  const { closeModal } = useModal();

  return (
    <div className="space-y-4">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3 pt-2">
        {fields.map((field, i) => {
          const Icon = field.icon;
          return (
            <div className=''>
              <div key={i} className="flex items-start gap-3 px-2">
                <div className="mt-0.5 p-1.5 rounded-md bg-gray-100 dark:bg-gray-700">
                  <Icon size={14} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {field.label}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5 wrap-break-word">
                    {field.value || '—'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={closeModal}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Helper builders para cada tipo de movimiento
// ============================================================================

export function buildWaterBottlesFields(movement: {
  movementType: string;
  quantity: number;
  createdAt: string;
  notes?: string;
}, createdByName: string) {
  return [
    { label: 'Fecha', value: `${formatDateDMY(movement.createdAt?.split('T')[0])} — ${formatTimeHM(movement.createdAt)}`, icon: Calendar },
    { label: 'Tipo', value: movement.movementType === 'entry' ? 'Entrada' : 'Salida', icon: Tag },
    { label: 'Cantidad', value: `${movement.quantity} botellones`, icon: Package },
    { label: 'Registrado por', value: createdByName, icon: User },
    { label: 'Observaciones', value: movement.notes || '—', icon: FileText },
  ];
}

export function buildFuelFields(movement: {
  movementType: string;
  amount: number;
  createdAt: string;
  notes?: string;
}, createdByName: string) {
  return [
    { label: 'Fecha', value: `${formatDateDMY(movement.createdAt?.split('T')[0])} — ${formatTimeHM(movement.createdAt)}`, icon: Calendar },
    { label: 'Tipo', value: movement.movementType === 'entry' ? 'Entrada' : 'Salida', icon: Tag },
    { label: 'Cantidad', value: `${movement.amount.toFixed(2)} litros`, icon: Package },
    { label: 'Registrado por', value: createdByName, icon: User },
    { label: 'Observaciones', value: movement.notes || '—', icon: FileText },
  ];
}

export function buildMaterialFields(movement: {
  movementType: string;
  quantity: number;
  createdAt: string;
  notes?: string;
}, materialName: string, materialUnit: string, createdByName: string) {
  return [
    { label: 'Fecha', value: `${formatDateDMY(movement.createdAt?.split('T')[0])} — ${formatTimeHM(movement.createdAt)}`, icon: Calendar },
    { label: 'Tipo', value: movement.movementType === 'entry' ? 'Entrada' : 'Salida', icon: Tag },
    { label: 'Material', value: `${materialName} (${movement.quantity} ${materialUnit})`, icon: Package },
    { label: 'Registrado por', value: createdByName, icon: User },
    { label: 'Observaciones', value: movement.notes || '—', icon: FileText },
  ];
}

export function buildVacuumFields(action: {
  actionName: string;
  createdAt: string;
  notes?: string;
}, createdByName: string) {
  return [
    { label: 'Fecha', value: `${formatDateDMY(action.createdAt?.split('T')[0])} — ${formatTimeHM(action.createdAt)}`, icon: Calendar },
    { label: 'Acción', value: action.actionName, icon: Tag },
    { label: 'Registrado por', value: createdByName, icon: User },
    { label: 'Observaciones', value: action.notes || '—', icon: FileText },
  ];
}

export function buildRequestFields(request: {
  requestType: string;
  quantity?: number;
  actionRequested?: string;
  status: string;
  requestedAt: string;
  statusChangedAt?: string;
  notes?: string;
}, requestedByName: string, statusChangedByName: string, typeLabel: string, statusLabel: string, materialName?: string) {
  const detail = request.requestType === 'vacuum'
    ? request.actionRequested || '—'
    : materialName
      ? `${materialName} (${request.quantity ?? '—'})`
      : `${request.quantity ?? '—'}`;

  const fields = [
    { label: 'Fecha de solicitud', value: `${formatDateDMY(request.requestedAt?.split('T')[0])} — ${formatTimeHM(request.requestedAt)}`, icon: Calendar },
    { label: 'Tipo', value: typeLabel, icon: ClipboardSignature },
    { label: 'Detalle', value: detail, icon: Package },
    { label: 'Estado', value: statusLabel, icon: Info },
    { label: 'Solicitado por', value: requestedByName, icon: User },
  ];

  if (request.statusChangedAt && statusChangedByName !== '—') {
    fields.push({ label: 'Estado cambiado por', value: `${statusChangedByName} — ${formatDateDMY(request.statusChangedAt?.split('T')[0])}`, icon: Tag });
  }

  fields.push({ label: 'Observaciones', value: request.notes || '—', icon: FileText });

  return fields;
}
