import { Link, useLocation } from 'react-router-dom';
import { getVersion } from '@tauri-apps/api/app';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { Button } from '../ui';
import {
  ClipboardCheck,
  ClipboardList,
  Forklift,
  LayoutDashboard,
  List,
  LogOut,
  Shield,
  AlertTriangle,
  UserCircle,
  CloudDownload,
} from 'lucide-react';
import { canAccessModule } from '../../lib/permissions';
import type { AppModule } from '../../types/user';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const logoPath = useAppSettingsStore((s) => s.settings?.logoPath ?? null);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  const navigation: Array<{
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
    module: AppModule;
  }> = [
    { name: 'Dashboard',      href: '/dashboard',  icon: LayoutDashboard, module: 'dashboard' },
    { name: 'Aprobaciones',   href: '/approvals',  icon: ClipboardCheck,  module: 'approvals' },
    { name: 'Reportes',       href: '/reports',     icon: List,            module: 'reports' },
    { name: 'Logística',      href: '/logistics',   icon: Forklift,        module: 'logistics' },
    { name: 'Incidencias',       href: '/incidents',   icon: AlertTriangle,  module: 'incidents' },
    { name: 'Registros Diarios', href: '/cloud-logs',  icon: CloudDownload,  module: 'cloud-logs' },
    { name: 'Administración',    href: '/admin',       icon: Shield,         module: 'admin' },
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
      className={`w-64 bg-gray-50 dark:bg-gray-800 border-r border-primary-200 dark:border-gray-700 flex flex-col ${className}`}
    >
      {/* Logo/Brand — height matches Header component (py-4) */}
      <div className="h-15 px-6 border-b border-primary-200 dark:border-gray-700 flex items-center">
        {logoPath ? (
          <div className="flex items-center justify-center w-full">
            <img
              src={logoPath}
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
          .filter((item) => canAccessModule(user, item.module))
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
        <Link
          to="/profile"
          className={`flex items-center gap-3 px-2 py-2 mb-2 rounded-lg transition-colors ${
            location.pathname === '/profile'
              ? 'bg-primary-500'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          style={location.pathname === '/profile' ? { color: 'var(--color-primary-contrast)' } : undefined}
        >
          <UserCircle size={20} className={location.pathname === '/profile' ? '' : 'text-gray-500 dark:text-gray-400'} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${
              location.pathname === '/profile' ? '' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {user?.fullName || user?.username}
            </p>
            <p className={`text-xs capitalize ${
              location.pathname === '/profile' ? 'opacity-80' : 'text-gray-500'
            }`}>Rol: {user?.role}</p>
          </div>
        </Link>
        <Button
          onClick={logout}
          variant="danger"
          size="sm"
          icon={<LogOut size={16} />}
          className="w-full"
        >
          <span>Cerrar Sesión</span>
        </Button>
        {appVersion && (
          <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-3">
            v{appVersion}
          </p>
        )}
      </div>
    </aside>
  );
}
