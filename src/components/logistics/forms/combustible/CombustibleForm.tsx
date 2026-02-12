import { useState } from 'react';
import { useModalStore } from '../../../../store';
import { Fuel, Plus, Minus } from 'lucide-react';
import { CombustibleIngresoTab } from './CombustibleIngresoTab';
import { CombustibleGastoTab } from './CombustibleGastoTab';
import { Button } from '@/components/ui/Button';

type TabType = 'ingreso' | 'gasto';

interface CombustibleFormProps {
  onSuccess?: () => void;
  initialTab?: TabType;
}

export function CombustibleForm({ onSuccess, initialTab = 'ingreso' }: CombustibleFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const { closeModal } = useModalStore();

  const handleSuccess = () => {
    onSuccess?.();
    closeModal();
  };

  const tabs = [
    { id: 'ingreso' as TabType, label: 'Ingreso', icon: Plus, color: 'text-green-600' },
    { id: 'gasto' as TabType, label: 'Gasto', icon: Minus, color: 'text-red-600' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header con icono */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <Fuel className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Combustible
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Registrar movimiento de combustible
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 ring-1 ring-primary-500/20' 
                  : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <Icon size={18} className={isActive ? 'text-primary-500' : tab.color} />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Contenido según tab */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'ingreso' && <CombustibleIngresoTab onSuccess={handleSuccess} />}
        {activeTab === 'gasto' && <CombustibleGastoTab onSuccess={handleSuccess} />}
      </div>
    </div>
  );
}