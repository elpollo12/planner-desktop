import { useState, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';
import { 
  Droplets, 
  Fuel, 
  Container, 
  Package, 
  FlaskConical,
  GaugeCircle,
  ClipboardSignature,
  TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';

// Componentes de cada tab
import { BotellonesInventory } from '../components/logistics/BotellonesInventory';
import { CombustibleInventory } from '../components/logistics/CombustibleInventory';
import { VacuumInventory } from '../components/logistics/VacuumInventory';
import { MaterialesInventory } from '../components/logistics/MaterialesInventory';
import { LogisticsReports } from '../components/logistics/LogisticsReports';
import { RequestsManagement } from '../components/logistics/RequestsManagement';

// Tipos
type LogisticsTab = 'botellones' | 'combustible' | 'vacuum' | 'materiales' | 'solicitudes' | 'reportes';

interface LogisticsStats {
  botellones: {
    llenos: number;
    vacios: number;
    total: number;
  };
  combustible: {
    reserva: number;
    enUso: number;
    gastado: number;
    total: number;
  };
  vacuum: {
    reserva: number;
    enUso: number;
    gastada: number;
    total: number;
  };
  materiales: {
    disponible: number;
    usado: number;
    consumiblesActivos: number;
  };
  solicitudesPendientes: number;
}

export default function LogisticsPage() {
  const { user, sessionToken, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<LogisticsTab>('botellones');
  const [stats, setStats] = useState<LogisticsStats>({
    botellones: { llenos: 0, vacios: 0, total: 0 },
    combustible: { reserva: 0, enUso: 0, gastado: 0, total: 0 },
    vacuum: { reserva: 0, enUso: 0, gastada: 0, total: 0 },
    materiales: { disponible: 0, usado: 0, consumiblesActivos: 0 },
    solicitudesPendientes: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    if (sessionToken) {
      loadLogisticsStats();
    }
  }, [sessionToken]);

  const loadLogisticsStats = async () => {
    if (!sessionToken) return;

    setLoadingStats(true);
    try {
      // Simulated API calls - replace with real implementations
      const mockStats: LogisticsStats = {
        botellones: { llenos: 150, vacios: 45, total: 195 },
        combustible: { reserva: 500, enUso: 200, gastado: 1200, total: 1900 },
        vacuum: { reserva: 2500, enUso: 800, gastada: 3500, total: 6800 },
        materiales: { disponible: 350, usado: 180, consumiblesActivos: 15 },
        solicitudesPendientes: 0
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading logistics stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const tabs = [
    { 
      id: 'botellones' as LogisticsTab, 
      label: 'Botellones de Agua', 
      icon: Droplets,
      description: 'Gestión de botellones llenos y vacíos'
    },
    { 
      id: 'combustible' as LogisticsTab, 
      label: 'Combustible', 
      icon: Fuel,
      description: 'Control de reserva, uso y gasto'
    },
    { 
      id: 'vacuum' as LogisticsTab, 
      label: 'Vacuum', 
      icon: Container,
      description: 'Gestión de vacuum'
    },
    { 
      id: 'materiales' as LogisticsTab, 
      label: 'Materiales', 
      icon: Package,
      description: 'Consumibles y materiales'
    },
    { 
      id: 'solicitudes' as LogisticsTab, 
      label: 'Solicitudes', 
      icon: ClipboardSignature,
      description: 'Solicitudes pendientes',
      badge: stats.solicitudesPendientes
    },
    {
      id: 'reportes' as LogisticsTab,
      label: 'Reportes',
      icon: TrendingUp,
      description: 'Generación de reportes y estadísticas'
    }
  ];

  // Render stats cards based on active tab
  const renderStatsCards = () => {
    if (activeTab === 'solicitudes' || activeTab === 'reportes') {
      return null;
    }

    switch (activeTab) {
      case 'botellones':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Botellones Llenos</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.botellones.llenos}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">unidades</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Droplets className="text-green-600 dark:text-green-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Botellones Vacíos</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.botellones.vacios}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">unidades</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <Droplets className="text-yellow-600 dark:text-yellow-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Botellones</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.botellones.total}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">unidades</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <GaugeCircle className="text-blue-600 dark:text-blue-400" size={28} />
                </div>
              </div>
            </Card>
          </div>
        );

      case 'combustible':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">En Reserva</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.combustible.reserva}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">litros</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Fuel className="text-blue-600 dark:text-blue-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">En Uso</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.combustible.enUso}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">litros</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <Fuel className="text-purple-600 dark:text-purple-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gastado</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.combustible.gastado}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">litros</p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <Fuel className="text-gray-600 dark:text-gray-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.combustible.total}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">litros</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Fuel className="text-green-600 dark:text-green-400" size={28} />
                </div>
              </div>
            </Card>
          </div>
        );

      case 'vacuum':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Reserva</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.vacuum.reserva}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">litros</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Container className="text-blue-600 dark:text-blue-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">En Uso</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.vacuum.enUso}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">litros</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <Container className="text-purple-600 dark:text-purple-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gastada</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.vacuum.gastada}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">litros</p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <Container className="text-gray-600 dark:text-gray-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.vacuum.total}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">litros</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Container className="text-green-600 dark:text-green-400" size={28} />
                </div>
              </div>
            </Card>
          </div>
        );

      case 'materiales':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Material Disponible</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.materiales.disponible}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">unidades</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Package className="text-green-600 dark:text-green-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Material Usado</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.materiales.usado}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">unidades</p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <Package className="text-gray-600 dark:text-gray-400" size={28} />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Consumibles Activos</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loadingStats ? '...' : stats.materiales.consumiblesActivos}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">tipos</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <FlaskConical className="text-blue-600 dark:text-blue-400" size={28} />
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout
      title="Logística"
      subtitle="Gestión de inventario y solicitudes"
    >
      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Main Card with Tabs */}
      <Card className="mt-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? ''
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    }
                  `}
                  style={activeTab === tab.id ? {
                    color: 'var(--color-primary-500)',
                    borderBottomColor: 'var(--color-primary-500)',
                  } : undefined}
                  title={tab.description}
                >
                  <Icon size={18} />
                  {tab.label}
                  {tab.badge ? (
                    <span className="ml-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-medium">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'botellones' && <BotellonesInventory stats={stats.botellones} onUpdate={loadLogisticsStats} />}
          {activeTab === 'combustible' && <CombustibleInventory stats={stats.combustible} onUpdate={loadLogisticsStats} />}
          {activeTab === 'vacuum' && <VacuumInventory stats={stats.vacuum} onUpdate={loadLogisticsStats} />}
          {activeTab === 'materiales' && <MaterialesInventory stats={stats.materiales} onUpdate={loadLogisticsStats} />}
          {activeTab === 'solicitudes' && <RequestsManagement onUpdate={loadLogisticsStats}/>}
          {activeTab === 'reportes' && <LogisticsReports />}
        </div>
      </Card>

      {/* Quick Stats for Admins */}
      {activeTab !== 'solicitudes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Solicitudes Pendientes</h3>
              <ClipboardSignature className="text-orange-500" size={24} />
            </div>
            {stats.solicitudesPendientes > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.solicitudesPendientes}
                  </p>
                  <p className="text-sm text-gray-500">requieren atención</p>
                </div>
                <button
                  onClick={() => setActiveTab('solicitudes')}
                  className="px-4 py-2 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-100 transition"
                >
                  Ver solicitudes
                </button>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No hay solicitudes pendientes</p>
            )}
          </Card>
        </div>
      )}
    </MainLayout>
  );
}