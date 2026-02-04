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
    <div className="border-b border-gray-200 bg-white">
      <nav className="flex overflow-x-auto">
        {REPORT_TABS.map((tab: Tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isCompleted = completedTabs.has(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-4 border-b-2 transition-colors
                whitespace-nowrap min-w-fit hover:cursor-pointer
                ${
                  isActive
                    ? 'border-[#1E3A5F] text-[#1E3A5F] bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
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
