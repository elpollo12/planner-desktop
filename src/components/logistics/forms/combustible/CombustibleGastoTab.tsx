import { useState } from 'react';
import { User, Fuel, Hash, Gauge } from 'lucide-react';
import { useModalStore } from '@/store';

interface CombustibleGastoTabProps {
  onSuccess?: () => void;
}

export function CombustibleGastoTab({ onSuccess }: CombustibleGastoTabProps) {
  const [formData, setFormData] = useState({
    cantidad: '',
    equipo: '',
    operador: '',
    horaInicio: '',
    horaFin: '',
    odometro: '',
    observaciones: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Gasto de combustible:', formData);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg mb-4">
        <p className="text-sm text-red-700 dark:text-red-400">
          Registrar consumo o gasto de combustible
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cantidad */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cantidad (Litros) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Fuel className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Equipo */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Equipo / Taladro <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <select
              required
              value={formData.equipo}
              onChange={(e) => setFormData({ ...formData, equipo: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Seleccionar equipo</option>
              <option value="taladro-1">Taladro 1</option>
              <option value="taladro-2">Taladro 2</option>
              <option value="taladro-3">Taladro 3</option>
              <option value="generador">Generador</option>
              <option value="vehiculo">Vehículo</option>
            </select>
          </div>
        </div>

        {/* Operador */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Operador <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <select
              required
              value={formData.operador}
              onChange={(e) => setFormData({ ...formData, operador: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Seleccionar operador</option>
              <option value="juan">Juan Pérez</option>
              <option value="maria">María García</option>
              <option value="carlos">Carlos López</option>
            </select>
          </div>
        </div>

        {/* Rango de Horas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hora Inicio
          </label>
          <input
            type="time"
            value={formData.horaInicio}
            onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hora Fin
          </label>
          <input
            type="time"
            value={formData.horaFin}
            onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Odómetro */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Odómetro / Horómetro
          </label>
          <div className="relative">
            <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={formData.odometro}
              onChange={(e) => setFormData({ ...formData, odometro: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              placeholder="Lectura del medidor"
            />
          </div>
        </div>

        {/* Observaciones */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Observaciones
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
            placeholder="Observaciones adicionales..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => useModalStore.getState().closeModal()}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center gap-2"
        >
          <Fuel size={16} />
          Registrar Gasto
        </button>
      </div>
    </form>
  );
}