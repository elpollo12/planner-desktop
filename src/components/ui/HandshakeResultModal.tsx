import { CheckCircle2, XCircle, Building2, ShieldCheck, Users, Database } from 'lucide-react';
import { Button } from './Button';
import { useModal } from '../../store/modalStore';

export type HandshakeOutcome =
  | { type: 'success'; tablesWritten: number; tenant: string }
  | { type: 'tenant_not_found'; tenant: string }
  | { type: 'error'; message: string };

interface Props {
  outcome: HandshakeOutcome;
}

export function HandshakeResultContent({ outcome }: Props) {
  const { closeModal } = useModal();

  if (outcome.type === 'success') {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 size={36} className="text-green-600 dark:text-green-400" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Conexion exitosa
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Los datos del servidor fueron descargados correctamente.
          </p>
        </div>

        <div className="w-full rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 divide-y divide-green-200 dark:divide-green-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <Building2 size={16} className="text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Empresa</span>
            <span className="ml-auto text-sm font-mono font-medium text-green-700 dark:text-green-300">
              {outcome.tenant}
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Database size={16} className="text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Registros descargados</span>
            <span className="ml-auto text-sm font-semibold text-green-700 dark:text-green-300">
              {outcome.tablesWritten}
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Users size={16} className="text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Usuarios y permisos</span>
            <span className="ml-auto text-sm font-medium text-green-700 dark:text-green-300">
              Sincronizados
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <ShieldCheck size={16} className="text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Estilos y configuracion</span>
            <span className="ml-auto text-sm font-medium text-green-700 dark:text-green-300">
              Aplicados
            </span>
          </div>
        </div>

        <Button variant="primary" className="w-full" onClick={closeModal}>
          Continuar al inicio de sesion
        </Button>
      </div>
    );
  }

  if (outcome.type === 'tenant_not_found') {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Building2 size={36} className="text-amber-600 dark:text-amber-400" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Empresa no registrada
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            El tenant <span className="font-mono font-medium">"{outcome.tenant}"</span> no existe
            o esta inactivo en el servidor.
          </p>
        </div>

        <div className="w-full rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-left">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
            Que significa esto?
          </p>
          <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
            <li>La licencia esta activa y es valida</li>
            <li>No se pudieron descargar usuarios ni configuracion</li>
            <li>Solo el administrador del sistema podra iniciar sesion</li>
            <li>Contacte al administrador para registrar la empresa en el servidor</li>
          </ul>
        </div>

        <Button variant="secondary" className="w-full" onClick={closeModal}>
          Entendido, continuar
        </Button>
      </div>
    );
  }

  // type === 'error'
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30">
        <XCircle size={36} className="text-red-500 dark:text-red-400" />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No se pudo conectar al servidor
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          La licencia esta activa. Puede iniciar sesion si ya tiene datos locales.
        </p>
      </div>

      <div className="w-full rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-left">
        <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Detalle del error</p>
        <p className="text-xs font-mono text-red-700 dark:text-red-400 break-all">
          {outcome.message}
        </p>
      </div>

      <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-left">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Puede continuar si:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Ya sincronizo anteriormente en este equipo</li>
          <li>Usa el usuario administrador del sistema</li>
        </ul>
      </div>

      <Button variant="secondary" className="w-full" onClick={closeModal}>
        Continuar de todas formas
      </Button>
    </div>
  );
}
