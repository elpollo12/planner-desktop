import { Bell } from 'lucide-react';
import { BreadCrumps } from '../ui';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function Header({ title, subtitle, actions, className = '' }: HeaderProps) {

  return (
    <header className={`h-[60px] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
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
          <div className="flex items-center gap-4">
            {actions}
            
            {/* Notifications */}
            <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Bell size={20} />
              {/* Badge example */}
              {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> */}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
