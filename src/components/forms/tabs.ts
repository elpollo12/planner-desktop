import { FileText, Users, Clock, Wrench, Droplet, Map, FileEdit } from 'lucide-react';

export interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
}

export const REPORT_TABS: Tab[] = [
  {
    id: 'header',
    label: 'Encabezado',
    icon: FileText,
    description: 'Datos generales del reporte',
  },
  {
    id: 'crew',
    label: 'Cuadrilla',
    icon: Users,
    description: 'Personal por turno',
  },
  {
    id: 'time',
    label: 'Tiempos',
    icon: Clock,
    description: 'Distribución de tiempo',
  },
  {
    id: 'bits',
    label: 'Mechas',
    icon: Wrench,
    description: 'Record de brocas',
  },
  {
    id: 'mud',
    label: 'Lodo',
    icon: Droplet,
    description: 'Propiedades y aditivos',
  },
  {
    id: 'lithology',
    label: 'Litología',
    icon: Map,
    description: 'Parámetros de perforación',
  },
  {
    id: 'observations',
    label: 'Observaciones',
    icon: FileEdit,
    description: 'Detalles de operación',
  },
];
