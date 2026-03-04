import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Search, Upload, X, Building2, HardHat, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { backgroundPush } from '@/lib/syncHelper';
import { useCompaniesStore } from '@/store/companiesStore';
import { useModal } from '@/store/modalStore';
import type { Company, CompanyType, UpdateCompanyInput } from '@/types/company';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import OperatorForm from './forms/OperatorForm';
import ContractorForm from './forms/ContractorForm';

function companyTypeLabel(type: CompanyType): string {
  return type === 'operator' ? 'Operadora' : 'Contratista';
}

function CompanyTypeIcon({ type, className }: { type: CompanyType; className?: string }) {
  return type === 'operator'
    ? <Building2 className={className} />
    : <HardHat className={className} />;
}

// ============================================================================
// Company Card
// ============================================================================

interface CompanyCardProps {
  company: Company;
  logoDataUrl: string | null | undefined;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  onUploadLogo: (companyId: string) => void;
  onRemoveLogo: (companyId: string) => void;
}

function CompanyCard({ company, logoDataUrl, onEdit, onDelete, onUploadLogo, onRemoveLogo }: CompanyCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 ${
        company.active
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="relative group flex-shrink-0">
          <div className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-white dark:bg-gray-700 overflow-hidden">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt={company.name} className="w-full h-full object-contain" />
            ) : (
              <CompanyTypeIcon type={company.companyType} className="w-7 h-7 text-gray-400" />
            )}
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
            <button
              onClick={() => onUploadLogo(company.id)}
              className="p-1 bg-gray-50 rounded-full hover:bg-gray-100"
              title="Subir logo"
            >
              <Upload className="w-3.5 h-3.5 text-gray-700" />
            </button>
            {company.logo && (
              <button
                onClick={() => onRemoveLogo(company.id)}
                className="p-1 bg-gray-50 rounded-full hover:bg-gray-100"
                title="Eliminar logo"
              >
                <X className="w-3.5 h-3.5 text-red-600" />
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
            {company.name}
          </h3>
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
              company.active
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {company.active ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onEdit(company)} title="Editar">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(company)}
            title="Eliminar"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Company Section (one per type)
// ============================================================================

interface CompanySectionProps {
  title: string;
  type: CompanyType;
  companies: Company[];
  companyLogos: Record<string, string | null>;
  searchTerm: string;
  isLoading: boolean;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  onCreateForType: (type: CompanyType) => void;
  onUploadLogo: (companyId: string) => void;
  onRemoveLogo: (companyId: string) => void;
}

const PAGE_SIZE = 3;

function CompanySection({
  title, type, companies, companyLogos, searchTerm, isLoading,
  onEdit, onDelete, onCreateForType, onUploadLogo, onRemoveLogo,
}: CompanySectionProps) {
  const [page, setPage] = useState(1);

  const filtered = companies.filter(
    (c) => c.companyType === type && c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Clamp page whenever the list shrinks (delete) or search changes
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))));
  }, [filtered.length, searchTerm]);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isOperator = type === 'operator';
  const accentClass = isOperator
    ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
  const iconClass = isOperator ? 'text-blue-500' : 'text-amber-500';

  return (
    <Card>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isOperator
            ? <Building2 className={`w-5 h-5 ${iconClass}`} />
            : <HardHat className={`w-5 h-5 ${iconClass}`} />
          }
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${accentClass}`}>
            {filtered.length}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCreateForType(type)}
          icon={<Plus className="w-4 h-4" />}
        >
          Agregar
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg" style={{ minHeight: '264px' }}>
          {isOperator
            ? <Building2 className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            : <HardHat className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          }
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            {searchTerm ? 'Sin resultados' : `No hay ${title.toLowerCase()} registradas`}
          </p>
          {!searchTerm && (
            <button
              onClick={() => onCreateForType(type)}
              className="mt-2 text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 underline"
            >
              Agregar primera
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3" style={{ minHeight: '264px' }}>
            {paginated.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                logoDataUrl={companyLogos[company.id]}
                onEdit={onEdit}
                onDelete={onDelete}
                onUploadLogo={onUploadLogo}
                onRemoveLogo={onRemoveLogo}
              />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CompaniesManagement() {
  const { sessionToken } = useAuthStore();
  const {
    companies, companyLogos, isLoading,
    loadCompanies, createCompany, updateCompany, deleteCompany,
    uploadLogo, removeLogo,
  } = useCompaniesStore();
  const { openModal, closeModal } = useModal();

  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCompanyId, setUploadingCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionToken) {
      loadCompanies(sessionToken, !includeInactive);
    }
  }, [sessionToken, includeInactive]);

  const openCreateModal = (type: CompanyType = 'operator') => {
    const isOperator = type === 'operator';

    const handleCreateSubmit = async (data: UpdateCompanyInput) => {
      try {
        // Forms already set companyType in the payload when creating
        await createCompany(sessionToken!, data as any);
        toast.success(isOperator ? 'Operadora creada exitosamente' : 'Contratista creado exitosamente');
        closeModal();
        backgroundPush(sessionToken!);
      } catch (error) {
        toast.error(error as string);
      }
    };

    openModal(
      isOperator
        ? <OperatorForm onSubmit={handleCreateSubmit} />
        : <ContractorForm onSubmit={handleCreateSubmit} />,
      {
        title: isOperator ? 'Nueva Operadora' : 'Nuevo Contratista',
        size: 'md',
        showCloseButton: true,
      }
    );
  };

  const handleEdit = (company: Company) => {
    const isOperator = company.companyType === 'operator';
    const FormComponent = isOperator ? OperatorForm : ContractorForm;
    const companyProp = isOperator ? 'operator' : 'contractor';

    const EditForm = () => {
      const [currentLogo, setCurrentLogo] = useState<string | null>(
        companyLogos[company.id] || null
      );
      return (
        <FormComponent
          {...{ [companyProp]: company }}
          logoDataUrl={currentLogo}
          onSubmit={async (data) => {
            try {
              await updateCompany(sessionToken!, company.id, data as UpdateCompanyInput);
              toast.success(`${companyTypeLabel(company.companyType)} actualizada exitosamente`);
              closeModal();
              backgroundPush(sessionToken!);
            } catch (error) {
              toast.error(error as string);
            }
          }}
          onUploadLogo={async (file) => {
            await uploadLogo(sessionToken!, company.id, file);
            await useCompaniesStore.getState().loadCompanyLogo(sessionToken!, company.id);
            setCurrentLogo(useCompaniesStore.getState().companyLogos[company.id] || null);
          }}
          onRemoveLogo={async () => {
            await removeLogo(sessionToken!, company.id);
            setCurrentLogo(null);
          }}
        />
      );
    };
    openModal(<EditForm />, {
      title: `Editar ${companyTypeLabel(company.companyType)}`,
      size: 'md',
      showCloseButton: true,
    });
  };

  const handleDelete = (company: Company) => {
    openModal(
      <div className="space-y-3">
        <p className="text-gray-700 dark:text-gray-300">
          ¿Estás seguro de eliminar{' '}
          <strong className="text-gray-900 dark:text-gray-100">"{company.name}"</strong>?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Los reportes que tengan esta empresa asignada mantendrán el nombre actual como texto.
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
            await deleteCompany(sessionToken!, company.id);
            toast.success('Empresa eliminada exitosamente');
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
    if (!file || !uploadingCompanyId || !sessionToken) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo excede el límite de 2MB');
      return;
    }
    try {
      await uploadLogo(sessionToken, uploadingCompanyId, file);
      toast.success('Logo subido exitosamente');
    } catch (error) {
      toast.error(error as string);
    } finally {
      setUploadingCompanyId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerLogoUpload = (companyId: string) => {
    setUploadingCompanyId(companyId);
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = async (companyId: string) => {
    if (!sessionToken) return;
    try {
      await removeLogo(sessionToken, companyId);
      toast.success('Logo eliminado');
    } catch (error) {
      toast.error(error as string);
    }
  };

  const sharedSectionProps = {
    companies,
    companyLogos,
    searchTerm,
    isLoading,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onCreateForType: openCreateModal,
    onUploadLogo: triggerLogoUpload,
    onRemoveLogo: handleRemoveLogo,
  };

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
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Empresas</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Administra operadoras y contratistas que aparecen en los reportes
        </p>
      </div>

      {/* Barra de búsqueda + checkbox */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre en ambas listas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer gap-2">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Incluir inactivos</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Dos secciones side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <CompanySection
          title="Operadoras"
          type="operator"
          {...sharedSectionProps}
        />
        <CompanySection
          title="Contratistas"
          type="contractor"
          {...sharedSectionProps}
        />
      </div>
    </div>
  );
}
