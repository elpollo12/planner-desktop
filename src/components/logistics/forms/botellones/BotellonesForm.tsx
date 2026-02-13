import { useState } from 'react';
import { Droplets, Plus, Minus } from 'lucide-react';
import { useModalStore } from '../../../../store';
import { BotellonesIngresoTab } from './BotellonesIngresoTab';
import { BotellonesConsumoTab } from './BotellonesConsumoTab';
import { Button } from '@/components/ui/Button';

type TabType = 'ingreso' | 'consumo';

interface BotellonesFormProps {
  rigId: string;
  onSuccess?: () => void;
  initialTab?: TabType;
}

export function BotellonesForm({ rigId, onSuccess, initialTab = 'ingreso' }: BotellonesFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const handleSuccess = () => {
    onSuccess?.();
    useModalStore.getState().closeModal();
  };

  const tabs = [
    { id: 'ingreso' as TabType, label: 'Ingreso', icon: Plus, className: `${activeTab === 'ingreso' ? 'bg-green-500! text-white!' : 'hover:bg-green-300!'}` },
    { id: 'consumo' as TabType, label: 'Consumo', icon: Minus, className: `${activeTab === 'consumo' ? 'bg-red-500! text-white!' : 'hover:bg-red-300!'}` },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <Droplets className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Botellones de Agua
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Registrar movimiento de botellones
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
              variant={isActive ? 'primary' : 'ghost'}
              size='md'
              icon={<Icon size={18} />}
              className={`flex flex-1 items-center justify-center ${tab.className} ${isActive ? 'text-primary-500' : tab.className}`}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'ingreso' && <BotellonesIngresoTab rigId={rigId} onSuccess={handleSuccess} />}
        {activeTab === 'consumo' && <BotellonesConsumoTab rigId={rigId} onSuccess={handleSuccess} />}
      </div>
    </div>
  );
}
