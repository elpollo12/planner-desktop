import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Search, Upload, X, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { backgroundPush } from '@/lib/syncHelper';
import { useOperatorsStore } from '@/store/operatorsStore';
import { useModal } from '@/store/modalStore';
import type { Operator, CreateOperatorInput, UpdateOperatorInput } from '@/types/operator';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface OperatorFormProps {
  operator?: Operator;
  logoDataUrl?: string | null;
  onSubmit: (data: CreateOperatorInput | UpdateOperatorInput) => Promise<void>;
  onUploadLogo?: (file: File) => Promise<void>;
  onRemoveLogo?: () => Promise<void>;
}

function OperatorForm({ operator, logoDataUrl, onSubmit, onUploadLogo, onRemoveLogo }: OperatorFormProps) {
  const [name, setName] = useState(operator?.name || '');
  const [active, setActive] = useState(operator?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setLoading(true);
    try {
      if (operator) {
        await onSubmit({ name: name.trim(), active });
      } else {
        await onSubmit({ name: name.trim() });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadLogo) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo excede el límite de 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      await onUploadLogo(file);
      toast.success('Logo actualizado');
    } catch (error) {
      toast.error(error as string);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!onRemoveLogo) return;
    try {
      await onRemoveLogo();
      toast.success('Logo eliminado');
    } catch (error) {
      toast.error(error as string);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nombre del Operador *
        </label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: PDVSA, Chevron, Shell"
          required
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Nombre de la empresa operadora
        </p>
      </div>

      {/* Logo section - only for editing */}
      {operator && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Logo
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 overflow-hidden">
              {logoDataUrl ? (
                <img
                  src={logoDataUrl}
                  alt={operator.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                icon={<Upload className="w-4 h-4" />}
              >
                {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
              </Button>
              {logoDataUrl && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleRemoveLogo}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Eliminar
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            PNG, JPG, SVG o WEBP. Máximo 2MB.
          </p>
        </div>
      )}

      {operator && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Activo
          </label>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button type="submit" variant="primary" loading={loading}>
          {operator ? 'Guardar Cambios' : 'Crear Operador'}
        </Button>
      </div>
    </form>
  );
}

export default function OperatorsManagement() {
  const { sessionToken } = useAuthStore();
  const { operators, operatorLogos, isLoading, loadOperators, createOperator, updateOperator, deleteOperator, uploadLogo, removeLogo } = useOperatorsStore();
  const { openModal, closeModal } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingOperatorId, setUploadingOperatorId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionToken) {
      loadOperators(sessionToken, !includeInactive);
    }
  }, [sessionToken, includeInactive]);

  const handleCreate = () => {
    openModal(
      <OperatorForm
        onSubmit={async (data) => {
          try {
            await createOperator(sessionToken!, data as CreateOperatorInput);
            toast.success('Operador creado exitosamente');
            closeModal();
            backgroundPush(sessionToken!);
          } catch (error) {
            toast.error(error as string);
          }
        }}
      />,
      {
        title: 'Crear Nuevo Operador',
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  const handleEdit = (operator: Operator) => {
    const EditForm = () => {
      const [currentLogo, setCurrentLogo] = useState<string | null>(operatorLogos[operator.id] || null);

      return (
        <OperatorForm
          operator={operator}
          logoDataUrl={currentLogo}
          onSubmit={async (data) => {
            try {
              await updateOperator(sessionToken!, operator.id, data as UpdateOperatorInput);
              toast.success('Operador actualizado exitosamente');
              closeModal();
              backgroundPush(sessionToken!);
            } catch (error) {
              toast.error(error as string);
            }
          }}
          onUploadLogo={async (file) => {
            await uploadLogo(sessionToken!, operator.id, file);
            // Reload logo after upload
            await useOperatorsStore.getState().loadOperatorLogo(sessionToken!, operator.id);
            setCurrentLogo(useOperatorsStore.getState().operatorLogos[operator.id] || null);
          }}
          onRemoveLogo={async () => {
            await removeLogo(sessionToken!, operator.id);
            setCurrentLogo(null);
          }}
        />
      );
    };

    openModal(
      <EditForm />,
      {
        title: 'Editar Operador',
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  const handleDelete = (operator: Operator) => {
    openModal(
      <div className="space-y-3">
        <p className="text-gray-700 dark:text-gray-300">
          ¿Estás seguro de eliminar el operador <strong className="text-gray-900 dark:text-gray-100">"{operator.name}"</strong>?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Los reportes que tengan este operador asignado mantendrán el nombre actual como texto.
        </p>
      </div>,
      {
        title: 'Confirmar Eliminación',
        size: 'md',
        showConfirmButton: true,
        showCancelButton: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          try {
            await deleteOperator(sessionToken!, operator.id);
            toast.success('Operador eliminado exitosamente');
            backgroundPush(sessionToken!);
          } catch (error) {
            toast.error(error as string);
          }
        },
      }
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingOperatorId || !sessionToken) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo excede el límite de 2MB');
      return;
    }

    try {
      await uploadLogo(sessionToken, uploadingOperatorId, file);
      toast.success('Logo subido exitosamente');
    } catch (error) {
      toast.error(error as string);
    } finally {
      setUploadingOperatorId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async (operatorId: string) => {
    if (!sessionToken) return;
    try {
      await removeLogo(sessionToken, operatorId);
      toast.success('Logo eliminado');
    } catch (error) {
      toast.error(error as string);
    }
  };

  const triggerLogoUpload = (operatorId: string) => {
    setUploadingOperatorId(operatorId);
    fileInputRef.current?.click();
  };

  const filteredOperators = operators.filter((op) =>
    op.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleLogoUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Operadores</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Administra las empresas operadoras que aparecerán en los reportes
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate} icon={<Plus />}>
          Crear Operador
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Checkbox incluir inactivos */}
          <div className="flex items-end pb-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Incluir inactivos
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Lista de Operadores */}
      <Card>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando operadores...</p>
          </div>
        ) : filteredOperators.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No se encontraron operadores' : 'No hay operadores registrados'}
            </p>
            {!searchTerm && (
              <Button variant="primary" onClick={handleCreate} className="mt-4" icon={<Plus />}>
                Crear Primer Operador
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOperators.map((operator) => (
              <div
                key={operator.id}
                className={`border rounded-lg p-4 ${
                  operator.active
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="relative group">
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 overflow-hidden">
                      {operatorLogos[operator.id] ? (
                        <img
                          src={operatorLogos[operator.id]!}
                          alt={operator.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    {/* Logo actions on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                      <button
                        onClick={() => triggerLogoUpload(operator.id)}
                        className="p-1 bg-gray-50 rounded-full hover:bg-gray-100"
                        title="Subir logo"
                      >
                        <Upload className="w-4 h-4 text-gray-700" />
                      </button>
                      {operator.logoPath && (
                        <button
                          onClick={() => handleRemoveLogo(operator.id)}
                          className="p-1 bg-gray-50 rounded-full hover:bg-gray-100"
                          title="Eliminar logo"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {operator.name}
                    </h3>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                        operator.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {operator.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(operator)}
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(operator)}
                      title="Eliminar"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredOperators.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            Mostrando {filteredOperators.length} de {operators.length} operadores
          </div>
        )}
      </Card>
    </div>
  );
}
