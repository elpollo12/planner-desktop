import { Card } from '../ui';

interface RequestsManagementProps {
  onUpdate: () => void;
}

export function RequestsManagement({ }: RequestsManagementProps) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          <p>Implementar tabla de movimientos de botellones</p>
        </div>
      </Card>
    </div>
  );
}