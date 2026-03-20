import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, ChevronLeft, ChevronRight, RefreshCw, Info } from 'lucide-react';
import { auditLogApi } from '@/lib/api/auditLog';
import type { AuditEntry, AuditLogPage } from '@/lib/api/auditLog';
import { AUDIT_ACTIONS } from '@/lib/api/auditLog';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS:       'Inicio de sesión',
  LOGOUT:              'Cierre de sesión',
  CREATE_USER:         'Usuario creado',
  UPDATE_USER:         'Usuario actualizado',
  DELETE_USER:         'Usuario eliminado',
  CHANGE_PASSWORD:     'Contraseña cambiada',
  UPDATE_APP_SETTINGS: 'Configuración actualizada',
  UPLOAD_LOGO:         'Logo subido',
  REMOVE_LOGO:         'Logo eliminado',
  ACTIVATE_LICENSE:    'Licencia activada',
  CONNECT_SYNC:        'Sync conectado',
  DISCONNECT_SYNC:     'Sync desconectado',
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  LOGOUT:              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CREATE_USER:         'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  UPDATE_USER:         'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  DELETE_USER:         'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  CHANGE_PASSWORD:     'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  UPDATE_APP_SETTINGS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  UPLOAD_LOGO:         'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  REMOVE_LOGO:         'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  ACTIVATE_LICENSE:    'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  CONNECT_SYNC:        'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  DISCONNECT_SYNC:     'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-VE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function parseDetail(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ─── Componente de detalle inline ────────────────────────────────────────────

function DetailPopover({ entry }: { entry: AuditEntry }) {
  const detail = parseDetail(entry.detail);
  const hasExtra = detail && Object.keys(detail).length > 0;

  if (!hasExtra && !entry.targetName && !entry.targetId) return null;

  return (
    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
      {entry.targetName && (
        <span className="block">Objeto: <span className="font-medium text-gray-700 dark:text-gray-300">{entry.targetName}</span></span>
      )}
      {detail && Object.entries(detail).map(([k, v]) => (
        <span key={k} className="block">
          {k}: <span className="font-medium text-gray-700 dark:text-gray-300">{String(v)}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function AuditLog() {
  const { sessionToken } = useAuthStore();
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [actorSearch, setActorSearch] = useState('');

  const load = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const result = await auditLogApi.list(
        sessionToken,
        page,
        PAGE_SIZE,
        actionFilter || undefined,
      );
      setData(result);
    } catch (e) {
      console.error('[AuditLog] Error cargando logs:', e);
    } finally {
      setLoading(false);
    }
  }, [sessionToken, page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  // Filtrado de actor en cliente (el filter de acción va al backend)
  const entries: AuditEntry[] = (data?.entries ?? []).filter(e =>
    actorSearch === '' ||
    e.actorName.toLowerCase().includes(actorSearch.toLowerCase())
  );

  const handleActionChange = (value: string) => {
    setActionFilter(value);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-gray-500 dark:text-gray-400" />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Registro de Auditoría
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Historial de acciones administrativas — almacenado localmente en esta instancia
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Filtro por acción */}
        <select
          value={actionFilter}
          onChange={e => handleActionChange(e.target.value)}
          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todas las acciones</option>
          {AUDIT_ACTIONS.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
          ))}
        </select>

        {/* Búsqueda por actor */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por usuario…"
            value={actorSearch}
            onChange={e => setActorSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>

        {/* Total */}
        {data && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            {data.total.toLocaleString()} {data.total === 1 ? 'entrada' : 'entradas'}
          </span>
        )}

        {/* Refresh */}
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Cargando…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <Info size={32} />
            <p className="text-sm">No hay entradas{actionFilter ? ' para esta acción' : ''}.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Fecha y hora</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Acción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {entries.map(entry => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Fecha */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {formatDate(entry.createdAt)}
                  </td>

                  {/* Acción badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </td>

                  {/* Actor */}
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">
                    {entry.actorName}
                  </td>

                  {/* Detalle */}
                  <td className="px-4 py-3">
                    <DetailPopover entry={entry} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
            Anterior
          </button>

          <span className="text-xs text-gray-500 dark:text-gray-400">
            Página {page + 1} de {data.pages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(data.pages - 1, p + 1))}
            disabled={page >= data.pages - 1 || loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
