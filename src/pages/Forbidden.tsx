import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui';

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldAlert size={48} className="text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Acceso Denegado
        </h1>

        {/* Message */}
        <p className="text-lg text-gray-600 mb-2">
          No tienes permisos para acceder a esta página
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Código de error: <span className="font-mono font-semibold">403 Forbidden</span>
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
          >
            Ir al Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Volver Atrás
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-400 mt-8">
          Si crees que deberías tener acceso, contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
}
