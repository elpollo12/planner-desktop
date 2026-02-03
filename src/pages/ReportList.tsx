import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';

export default function ReportList() {
  return (
    <MainLayout
      title="Reportes DDR"
      subtitle="Lista de reportes diarios de operaciones"
    >
      <Card>
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg font-medium mb-2">Lista de Reportes</p>
          <p className="text-sm">Esta sección será implementada en Fase 6</p>
        </div>
      </Card>
    </MainLayout>
  );
}
