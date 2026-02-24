import { REPORT_TABS, Tab } from './tabs';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  completedTabs?: Set<string>;
}

export function TabNavigation({ 
  activeTab, 
  onTabChange, 
  completedTabs = new Set() 
}: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <nav className="flex overflow-x-auto">
        {REPORT_TABS.map((tab: Tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isCompleted = completedTabs.has(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-4 border-b-2 transition-colors
                whitespace-nowrap min-w-fit hover:cursor-pointer
                ${
                  isActive
                    ? ''
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                }
              `}
              style={isActive ? {
                color: 'var(--color-primary-500)',
                borderBottomColor: 'var(--color-primary-500)',
                backgroundColor: 'color-mix(in srgb, var(--color-primary-500) 10%, transparent)',
              } : undefined}
            >
              <Icon size={20} />
              <div className="text-left">
                <div className="font-medium text-sm">{tab.label}</div>
              </div>
              {isCompleted && !isActive && (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
