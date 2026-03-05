import { Sun, Moon } from 'lucide-react';
import { usePreferencesStore } from '../../store/preferencesStore';
import { useAuthStore } from '../../store/authStore';
import { NotificationBell } from '../notifications';
import { ConnectionStatus } from '../ui/ConnectionStatus';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function Header({ title, subtitle, actions, className = '' }: HeaderProps) {
  const { sessionToken } = useAuthStore();
  const { preferences, toggleTheme } = usePreferencesStore();

  const isDarkMode = preferences?.themeMode === 'dark';

  const handleToggleTheme = async () => {
    if (sessionToken) {
      try {
        await toggleTheme(sessionToken);
      } catch (error) {
        console.error('Error al cambiar tema:', error);
      }
    }
  };

  return (
    <header className={`h-16 bg-gray-50 dark:bg-gray-800 border-b border-primary-200 dark:border-gray-700 ${className}`}>
      <div className="h-full px-6 flex items-center">
        <div className="flex items-center justify-between w-full">
          {/* Title Section */}
          <div>
            {title && (
              <h1 className="text-xl font-bold text-primary-500">{title}</h1>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2">
            {actions}

            {/* Connection Status */}
            <ConnectionStatus />

            {/* Theme Toggle */}
            <button
              onClick={handleToggleTheme}
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            <NotificationBell />
          </div>
        </div>
      </div>
    </header>
  );
}
