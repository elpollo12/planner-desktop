import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { Button } from '../ui';
import {
  LayoutDashboard,
  List,
  LogOut,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { settings } = useAppSettingsStore();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      name: 'Reportes',
      href: '/reports',
      icon: List,
      show: true,
    },
    {
      name: 'Administración',
      href: '/admin',
      icon: Shield,
      show: user?.role === 'admin',
    },
  ];

  const isActive = (href: string) => {
    // Exact match for the route
    if (location.pathname === href) {
      return true;
    }
    
    // For nested routes, check if it starts with href but exclude specific cases
    // Example: /reports/view/123 should activate /reports but not /reports/new
    if (href === '/reports') {
      // Only activate for /reports, /reports/view/:id, /reports/edit/:id
      // NOT for /reports/new
      return location.pathname.startsWith('/reports/view/') || 
             location.pathname.startsWith('/reports/edit/');
    }
    
    // For other routes, check if pathname starts with href + '/'
    return location.pathname.startsWith(href + '/');
  };

  return (
    <aside
      className={`w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}
    >
      {/* Logo/Brand — height matches Header component (py-4) */}
      <div className="h-15 px-6 border-b border-gray-200 dark:border-gray-700 flex items-center">
        {settings?.logoPath ? (
          <div className="flex items-center justify-center w-full">
            <img
              src={settings.logoPath}
              alt="Logo de la empresa"
              className="max-h-12 w-auto object-contain"
            />
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-bold text-primary-500">DDR System</h1>
            <p className="text-xs text-gray-500 mt-1">Reportes Petroleros</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${
                    active
                      ? 'bg-primary-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                style={active ? { color: 'var(--color-primary-contrast)' } : undefined}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {user?.fullName}
          </p>
          <p className="text-xs text-gray-500 capitalize">Rol: <strong>{user?.role}</strong></p>
        </div>
        <Button
          onClick={logout}
          variant="danger"
          size="sm"
          icon={<LogOut size={16} />}
          className="w-full"
        >
          <span>Cerrar Sesión</span>
        </Button>
      </div>
    </aside>
  );
}
