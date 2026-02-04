import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui';
import {
  LayoutDashboard,
  Plus,
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
      name: 'Nuevo Reporte',
      href: '/reports/new',
      icon: Plus,
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
      className={`w-64 bg-white border-r border-gray-200 flex flex-col ${className}`}
    >
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-[#1E3A5F]">DDR System</h1>
        <p className="text-xs text-gray-500 mt-1">Reportes Petroleros</p>
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
                      ? 'bg-[#1E3A5F] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.full_name}
          </p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        <Button
          onClick={logout}
          variant="danger"
          icon={<LogOut size={18} />}     
        >
          <span>Cerrar Sesión</span>
        </Button>
      </div>
    </aside>
  );
}
