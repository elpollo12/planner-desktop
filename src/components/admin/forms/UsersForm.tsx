import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { UserRole, UserWithRigs } from '@/types/user';
import type { Rig } from '@/types/rig';

interface UsersFormProps {
    onSubmit: (data: {
        username?: string;
        password?: string;
        fullName: string;
        ci: string;
        role: UserRole;
        active: boolean;
        hasAllRigs: boolean;
        assignedRigIds: string[];
        supervisorId?: string;
    }) => Promise<void>;
    user?: UserWithRigs | null;
    rigs: Rig[];
    supervisors?: UserWithRigs[];
    isEditing?: boolean;
    currentUserId?: string;
}

export default function UsersForm({ onSubmit, user, rigs, supervisors = [], isEditing = false, currentUserId }: UsersFormProps) {
    const isSelf = isEditing && !!currentUserId && user?.id === currentUserId;

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        ci: '',
        role: 'operator' as UserRole,
        active: true,
        hasAllRigs: false,  // Siempre inicia en false para usuarios nuevos
        assignedRigIds: [] as string[],
        supervisorId: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{
        username?: string;
        password?: string;
        fullName?: string;
        ci?: string;
        role?: string;
    }>({});

    const initialFormData = formData;

    // Inicializar formulario
    useEffect(() => {
        if (user) {
            // Si es admin, forzar hasAllRigs = true
            const isAdmin = user.role === 'admin';
            
            setFormData({
                username: user.username || '',
                password: '',
                fullName: user.fullName || '',
                ci: user.ci || '',
                role: user.role,
                active: user.active !== undefined ? user.active : true,
                hasAllRigs: isAdmin ? true : user.hasAllRigs,
                assignedRigIds: user.assignedRigIds || [],
                supervisorId: user.supervisorId || '',
            });
        } else {
            setFormData(initialFormData);
        }
    }, [user]);

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!isEditing && !formData.username.trim()) {
            newErrors.username = 'El nombre de usuario es requerido';
        } else if (!isEditing && formData.username.length < 3) {
            newErrors.username = 'Mínimo 3 caracteres';
        }

        if (!isEditing && !formData.password.trim()) {
            newErrors.password = 'La contraseña es requerida';
        } else if (!isEditing && formData.password.length < 6) {
            newErrors.password = 'Mínimo 6 caracteres';
        }

        if (formData.fullName && formData.fullName.length > 100) {
            newErrors.fullName = 'Máximo 100 caracteres';
        }

        if (formData.ci && formData.ci.length > 20) {
            newErrors.ci = 'Máximo 20 caracteres';
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
            const submitData = {
                ...formData,
                // Solo enviar username/password en creación
                username: isEditing ? undefined : formData.username,
                password: isEditing ? undefined : formData.password,
                // Solo enviar supervisorId para operadores
                supervisorId: formData.role === 'operator' ? formData.supervisorId || undefined : undefined,
            };
            await onSubmit(submitData);
        } catch (error) {
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof typeof formData, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (errors[field as keyof typeof errors]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    const handleRoleChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            role: value as UserRole,
            // Si es admin, tiene acceso a todos los taladros
            hasAllRigs: value === 'admin' ? true : prev.hasAllRigs,
            // Limpiar supervisor si no es operador
            supervisorId: value === 'operator' ? prev.supervisorId : '',
        }));
    };

    const toggleRigSelection = (rigId: string) => {
        setFormData(prev => ({
            ...prev,
            assignedRigIds: prev.assignedRigIds.includes(rigId)
                ? prev.assignedRigIds.filter(id => id !== rigId)
                : [...prev.assignedRigIds, rigId],
        }));
    };

    const selectAllRigs = () => {
        setFormData(prev => ({
            ...prev,
            assignedRigIds: rigs.map(r => r.id),
        }));
    };

    const deselectAllRigs = () => {
        setFormData(prev => ({
            ...prev,
            assignedRigIds: [],
        }));
    };

    const getRoleLabel = (role: UserRole) => {
        const labels = {
            admin: 'Administrador',
            supervisor: 'Supervisor',
            operator: 'Operador',
        };
        return labels[role];
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Username (solo en creación) */}
                    {!isEditing && (
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre de Usuario <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => handleChange('username', e.target.value)}
                                placeholder="Ej: juan.perez"
                                error={errors.username}
                                disabled={isSubmitting}
                                minLength={3}
                                maxLength={50}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Mínimo 3 caracteres, sin espacios
                            </p>
                        </div>
                    )}

                    {/* Password (solo en creación) */}
                    {!isEditing && (
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                placeholder="********"
                                error={errors.password}
                                disabled={isSubmitting}
                                minLength={6}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Mínimo 6 caracteres
                            </p>
                        </div>
                    )}

                    {/* Nombre Completo */}
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre Completo
                        </label>
                        <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) => handleChange('fullName', e.target.value)}
                            placeholder="Ej: Juan Pérez"
                            error={errors.fullName}
                            disabled={isSubmitting}
                            maxLength={100}
                        />
                    </div>

                    {/* Cédula */}
                    <div>
                        <label htmlFor="ci" className="block text-sm font-medium text-gray-700 mb-1">
                            Cédula (CI)
                        </label>
                        <Input
                            id="ci"
                            value={formData.ci}
                            onChange={(e) => handleChange('ci', e.target.value)}
                            placeholder="Ej: 12345678"
                            error={errors.ci}
                            disabled={isSubmitting}
                            maxLength={20}
                        />
                    </div>

                    {/* Rol */}
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                            Rol <span className="text-red-500">*</span>
                        </label>
                        <Select
                            id="role"
                            value={formData.role}
                            onChange={(e) => handleRoleChange(e.target.value)}
                            disabled={isSubmitting || isSelf}
                            options={[
                                { value: 'operator', label: 'Operador' },
                                { value: 'supervisor', label: 'Supervisor' },
                                { value: 'admin', label: 'Administrador' },
                            ]}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {isSelf
                                ? 'No puedes cambiar tu propio rol'
                                : <>{getRoleLabel(formData.role)}{formData.role === 'admin' && ' - Acceso completo al sistema'}</>}
                        </p>
                    </div>

                    {/* Supervisor (solo para operadores) */}
                    {formData.role === 'operator' && (
                        <div>
                            <label htmlFor="supervisorId" className="block text-sm font-medium text-gray-700 mb-1">
                                Supervisor <span className="text-red-500">*</span>
                            </label>
                            <Select
                                id="supervisorId"
                                value={formData.supervisorId}
                                onChange={(e) => handleChange('supervisorId', e.target.value)}
                                disabled={isSubmitting}
                                options={[
                                    { value: '', label: 'Seleccionar supervisor...' },
                                    ...supervisors.map(s => ({
                                        value: s.id,
                                        label: s.fullName || s.username,
                                    })),
                                ]}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                El supervisor asignado aprobará los reportes de este operador
                            </p>
                        </div>
                    )}
                </div>

                {/* Estado Activo/Inactivo (solo en edición) */}
                {isEditing && (() => {
                    return (
                        <div className={`flex items-center justify-between rounded-lg p-4 ${
                            isSelf
                                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                                : 'bg-gray-50 dark:bg-gray-800'
                        }`}>
                            <div>
                                <label htmlFor="active" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Estado del Usuario
                                </label>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {isSelf
                                        ? 'No puedes desactivar tu propia cuenta'
                                        : formData.active
                                            ? 'El usuario está activo y puede acceder al sistema'
                                            : 'El usuario está inactivo y no podrá iniciar sesión'}
                                </p>
                            </div>
                            <div className="flex items-center">
                                <label className={`relative inline-flex items-center ${isSelf ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        id="active"
                                        checked={formData.active}
                                        onChange={(e) => handleChange('active', e.target.checked)}
                                        className="sr-only peer"
                                        disabled={isSubmitting || !!isSelf}
                                    />
                                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-gray-50 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${isSelf ? 'opacity-50' : ''}`}></div>
                                </label>
                            </div>
                        </div>
                    );
                })()}

                {/* Acceso a Taladros */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Acceso a Taladros
                            </label>
                            <p className="text-xs text-gray-500">
                                {formData.role === 'admin'
                                    ? 'Los administradores tienen acceso completo a todos los taladros'
                                    : formData.hasAllRigs
                                        ? 'El usuario tiene acceso a todos los taladros'
                                        : `Acceso restringido a ${formData.assignedRigIds.length} taladro(s)`}
                            </p>
                        </div>

                        {formData.role !== 'admin' && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.hasAllRigs}
                                    onChange={(e) => {
                                        const newValue = e.target.checked;
                                        setFormData(prev => ({
                                            ...prev,
                                            hasAllRigs: newValue,
                                            // Si se activa "acceso a todos", limpiar la selección específica
                                            assignedRigIds: newValue ? [] : prev.assignedRigIds
                                        }));
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    disabled={isSubmitting}
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Acceso a todos los taladros
                                </span>
                            </label>
                        )}
                    </div>

                    {/* Solo mostrar selector de taladros si NO tiene acceso a todos Y no es admin */}
                    {(() => {
                        const shouldShow = formData.role !== 'admin' && !formData.hasAllRigs;
                        return shouldShow;
                    })() && (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAllRigs}
                                        className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 dark:text-blue-400 disabled:text-gray-400"
                                        disabled={isSubmitting}
                                    >
                                        Seleccionar todos
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                        type="button"
                                        onClick={deselectAllRigs}
                                        className="text-xs text-gray-600 hover:text-gray-100 cursor-pointer dark:text-gray-400 disabled:text-gray-400"
                                        disabled={isSubmitting}
                                    >
                                        Deseleccionar todos
                                    </button>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {formData.assignedRigIds.length} seleccionados
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                {rigs.map((rig) => (
                                    <label
                                        key={rig.id}
                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${formData.assignedRigIds.includes(rig.id)
                                                ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-300 dark:border-primary-700'
                                                : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                            } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.assignedRigIds.includes(rig.id)}
                                            onChange={() => toggleRigSelection(rig.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            disabled={isSubmitting}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm text-gray-900 dark:text-gray-100 truncate block">
                                                {rig.name}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                                                Operador: {rig.operator} | Potencia: {rig.power}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {rigs.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                    No hay taladros registrados
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
                </Button>
            </div>
        </form>
    );
}