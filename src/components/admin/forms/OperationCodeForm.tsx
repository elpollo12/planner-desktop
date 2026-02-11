import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { OperationCode } from '@/types/report';

interface OperationCodeFormProps {
  onSubmit: (data: {
    code: string;
    name: string;
    category: string;
    sortOrder: number;
    active: boolean;
  }) => Promise<void>;
  code?: OperationCode | null;
}

export default function OperationCodeForm({ onSubmit, code }: OperationCodeFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    sortOrder: 0,
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    code?: string;
    name?: string;
    sortOrder?: string;
  }>({});

  // Inicializar formulario con datos del código si existe
  useEffect(() => {
    if (code) {
      setFormData({
        code: code.code || '',
        name: code.name || '',
        category: code.category || '',
        sortOrder: code.sortOrder || 0,
        active: code.active !== undefined ? code.active : true,
      });
    }
  }, [code]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.code.trim()) {
      newErrors.code = 'El código es requerido';
    } else if (formData.code.length > 10) {
      newErrors.code = 'El código no puede exceder 10 caracteres';
    } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = 'Solo letras mayúsculas y números permitidos';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres';
    }

    if (formData.category && formData.category.length > 50) {
      newErrors.sortOrder = 'La categoría no puede exceder 50 caracteres';
    }

    if (formData.sortOrder < 0) {
      newErrors.sortOrder = 'El orden debe ser 0 o mayor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error en el formulario:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo cuando se modifica
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Código */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Código <span className="text-red-500">*</span>
            </label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="Ej: DR, WO, WS"
              error={errors.code}
              disabled={isSubmitting}
              maxLength={10}
            />
            <p className="mt-1 text-xs text-gray-500">
              Código abreviado (máx. 10 caracteres, solo mayúsculas y números)
            </p>
          </div>

          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Perforando, Esperando orden"
              error={errors.name}
              disabled={isSubmitting}
              maxLength={100}
            />
            <p className="mt-1 text-xs text-gray-500">
              Nombre descriptivo del código
            </p>
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Ej: Operación, Mantenimiento"
              error={errors.sortOrder}
              disabled={isSubmitting}
              maxLength={50}
            />
            <p className="mt-1 text-xs text-gray-500">
              Grupo al que pertenece el código
            </p>
          </div>

          {/* Orden */}
          <div>
            <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
              Orden
            </label>
            <Input
              id="sortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => handleChange('sortOrder', parseInt(e.target.value) || 0)}
              placeholder="0"
              error={errors.sortOrder}
              disabled={isSubmitting}
              min={0}
            />
            <p className="mt-1 text-xs text-gray-500">
              Orden de visualización (menor = primero)
            </p>
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div>
            <label htmlFor="active" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado del Código
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formData.active 
                ? 'El código está activo y disponible para uso'
                : 'El código está inactivo y no aparecerá en las listas'}
            </p>
          </div>
          
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => handleChange('active', e.target.checked)}
                className="sr-only peer"
                disabled={isSubmitting}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : code ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}