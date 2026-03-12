import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAuthStore } from '@/store/authStore';
import { useModal } from '@/store/modalStore';
import { usersApi, rigsApi, modulePermissionsApi } from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { KeyRound, User, HardHat, Shield, MapPin, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import i18n from '@/lib/i18n';
import type { RigWithArea } from '@/types/rig';

export default function Profile() {
    const { user, sessionToken } = useAuthStore();
    const { openModal } = useModal();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('rigs');
    const [rigs, setRigs] = useState<RigWithArea[]>([]);
    const [rigsLoading, setRigsLoading] = useState(true);

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [processing, setProcessing] = useState(false);

    // Permission modifier state
    const [permissionModifier, setPermissionModifier] = useState<{ modifiedBy: string; modifiedAt: string } | null>(null);

    // Load assigned rigs
    useEffect(() => {
        if (!sessionToken) return;
        setRigsLoading(true);
        rigsApi.listAccessible(sessionToken, false)
            .then(setRigs)
            .catch(() => setRigs([]))
            .finally(() => setRigsLoading(false));
    }, [sessionToken]);

    // Load permission modifier (only for non-admin users)
    useEffect(() => {
        if (!sessionToken || user?.role === 'admin') return;
        modulePermissionsApi.getMyModifier(sessionToken)
            .then(setPermissionModifier)
            .catch(() => {/* non-critical, ignore silently */});
    }, [sessionToken, user?.role]);

    const clearPasswordFields = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 4) {
            toast.error(t('profile.password.minLength'));
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error(t('profile.password.mismatchError'));
            return;
        }

        setProcessing(true);
        try {
            // Step 1: Verify current password
            const isValid = await usersApi.verifyOwnPassword(sessionToken!, currentPassword);

            if (!isValid) {
                // Wrong password → show error modal → clear inputs on close
                openModal(
                    <div className="text-center space-y-3">
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            {t('profile.password.wrongPassword')}
                        </p>
                    </div>,
                    {
                        title: t('profile.password.wrongPasswordTitle'),
                        size: 'sm',
                        showCancelButton: true,
                        cancelText: t('profile.password.closeBtn'),
                        onClose: clearPasswordFields,
                    }
                );
                setProcessing(false);
                return;
            }

            // Step 2: Password valid → ask for confirmation
            setProcessing(false);
            openModal(
                <div className="space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                        {t('profile.password.confirmMessage')}
                    </p>
                </div>,
                {
                    title: t('profile.password.confirmTitle'),
                    size: 'sm',
                    showConfirmButton: true,
                    showCancelButton: true,
                    confirmText: t('profile.password.confirmBtn'),
                    cancelText: t('incidents.common.cancel'),
                    onConfirm: async () => {
                        try {
                            await usersApi.changeOwnPassword(sessionToken!, currentPassword, newPassword);
                            toast.success(t('profile.password.changedSuccess'));
                        } catch (err: any) {
                            toast.error(err.message || String(err) || t('profile.password.changeError'));
                        }
                        clearPasswordFields();
                    },
                    onClose: clearPasswordFields,
                }
            );
        } catch (err: any) {
            toast.error(err.message || String(err) || t('profile.password.verifyError'));
            setProcessing(false);
        }
    };

    const roleBadgeClass: Record<string, string> = {
        admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        supervisor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        operator: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };

    const tabs = [
        { id: 'rigs', label: t('profile.tabs.rigs'), icon: <HardHat size={16} /> },
        { id: 'password', label: t('profile.tabs.password'), icon: <KeyRound size={16} /> },
    ];

    if (!user) return null;

    return (
        <MainLayout title={t('profile.title')} subtitle={t('profile.subtitle')}>
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Profile Header */}
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <User size={28} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                                {user.fullName || user.username}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            {user.ci && (
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('profile.header.cedula')}</p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.ci}</p>
                                </div>
                            )}
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeClass[user.role] || ''}`}>
                                {t(`profile.roles.${user.role}`, { defaultValue: user.role })}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Permission modifier notice (non-admin users only) */}
                {user.role !== 'admin' && permissionModifier && (
                    <Card>
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
                            <div>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
                                    {t('profile.permissions.lastModification')}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {t('profile.permissions.by')} <span className="font-medium">{permissionModifier.modifiedBy}</span>
                                    {' · '}
                                    {new Date(permissionModifier.modifiedAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'es-ES', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    })}
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Tabs Section */}
                <Card>
                    <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>

                        {/* Tab: Taladros */}
                        <TabPanel id="rigs" activeTab={activeTab}>
                            {rigsLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
                                </div>
                            ) : user.hasAllRigs || user.role === 'admin' ? (
                                <div className="flex items-center gap-2 py-3 px-4 bg-green-50 dark:bg-green-900/15 rounded-lg">
                                    <Shield size={16} className="text-green-600 dark:text-green-400" />
                                    <span className="text-sm text-green-700 dark:text-green-300">
                                        {t('profile.rigs.allAccess', { count: rigs.length })}
                                    </span>
                                </div>
                            ) : rigs.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                                    {t('profile.rigs.noRigs')}
                                </p>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                        {rigs.length !== 1 ? t('profile.rigs.rigCountPlural', { count: rigs.length }) : t('profile.rigs.rigCount', { count: rigs.length })}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {rigs.map((rig) => (
                                            <div
                                                key={rig.id}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                            >
                                                <HardHat size={16} className="text-primary-500 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{rig.name}</p>
                                                    {rig.areaName && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                            <MapPin size={10} /> {rig.areaName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </TabPanel>

                        {/* Tab: Cambiar Contraseña */}
                        <TabPanel id="password" activeTab={activeTab}>
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('profile.password.instructions')}
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('profile.password.currentLabel')}
                                    </label>
                                    <Input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder={t('profile.password.currentPlaceholder')}
                                        disabled={processing}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('profile.password.newLabel')}
                                    </label>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder={t('profile.password.newPlaceholder')}
                                        disabled={processing}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('profile.password.confirmLabel')}
                                    </label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder={t('profile.password.confirmPlaceholder')}
                                        disabled={processing}
                                    />
                                    {confirmPassword && newPassword !== confirmPassword && (
                                        <p className="mt-1 text-xs text-red-500">{t('profile.password.mismatch')}</p>
                                    )}
                                </div>
                                <div className='min-w-full flex justify-end items-center'>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        disabled={processing || !currentPassword || newPassword.length < 4 || newPassword !== confirmPassword}
                                        onClick={handleChangePassword}
                                        icon={<ArrowRight size={16} />}
                                        iconPosition='right'
                                    >
                                        {processing ? t('profile.password.processing') : t('profile.password.changeBtn')}
                                    </Button>
                                </div>
                            </div>
                        </TabPanel>

                    </Tabs>
                </Card>
            </div>
        </MainLayout>
    );
}
