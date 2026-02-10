import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { Button, Input, Card } from '../components/ui';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, isAuthenticated, setError } = useAuthStore();
  const { settings } = useAppSettingsStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      await login(username, password);
    } catch (err) {
      // Error is already set in the store
      console.error('Login failed:', err);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: 'url(/login.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <Card className="sm:min-w-1/2 md:min-w-1/3 max-w-md relative z-10 shadow-2xl">
        <div className="text-center mb-6">
          {settings?.logoPath ? (
            <div className="flex justify-center mb-4">
              <img
                src={settings.logoPath}
                alt="Logo de la empresa"
                className="h-20 w-auto object-contain"
              />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-primary-500 mb-2">
                Sistema de Reportes DDR
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Gestión de Taladros Petroleros</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Usuario"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ingrese su usuario"
            required
            autoFocus
          />

          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingrese su contraseña"
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isLoading}
            disabled={isLoading || !username || !password}
          >
            Iniciar Sesión
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center mb-2">
            Credenciales de prueba:
          </p>
          <p className="text-xs text-gray-700 font-mono text-center">
            Usuario: <strong>admin</strong> | Contraseña: <strong>admin123</strong>
          </p>
        </div>
      </Card>
    </div>
  );
}
