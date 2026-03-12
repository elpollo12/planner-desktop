import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { backgroundPush } from '@/lib/syncHelper';
import { usePreferencesStore } from '@/store/preferencesStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import LogoUploader from '@/components/ui/LogoUploader';
import { generatePalette, isValidHexColor } from '@/lib/colorUtils';
import { DEFAULT_APP_SETTINGS } from '@/types/appSettings';
import { applyThemeToDOM } from '@/hooks/useThemeApplicator';

const PRIMARY_PRESETS = [
  '#1e3a5f', '#1e40af', '#0f766e', '#4338ca', '#9333ea', '#be123c', '#c2410c', '#15803d',
];

const SECONDARY_PRESETS = [
  '#f97316', '#eab308', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
];

export default function AppearanceSettings() {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const { settings, saveSettings, uploadLogoFromBytes, removeLogo, isLoading } = useAppSettingsStore();
  const { preferences } = usePreferencesStore();
  const isInitializedRef = { current: false };
  const userHasInteractedRef = { current: false };

  const initialPrimary = settings?.primaryColor ?? DEFAULT_APP_SETTINGS.primaryColor;
  const initialSecondary = settings?.secondaryColor ?? DEFAULT_APP_SETTINGS.secondaryColor;

  const [primaryColor, setPrimaryColor] = useState(initialPrimary);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondary);
  const [primaryHex, setPrimaryHex] = useState(initialPrimary);
  const [secondaryHex, setSecondaryHex] = useState(initialSecondary);
  const [saving, setSaving] = useState(false);

  // Sync state when settings load/change (only once)
  useEffect(() => {
    if (settings && !isInitializedRef.current) {
      setPrimaryColor(settings.primaryColor);
      setSecondaryColor(settings.secondaryColor);
      setPrimaryHex(settings.primaryColor);
      setSecondaryHex(settings.secondaryColor);
      isInitializedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Live preview: only apply theme when user makes changes (not on mount)
  useEffect(() => {
    if (userHasInteractedRef.current) {
      const themeMode = preferences?.themeMode ?? 'light';
      applyThemeToDOM({ primaryColor, secondaryColor, themeMode });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryColor, secondaryColor, preferences]);

  const handlePrimaryColorChange = (color: string) => {
    userHasInteractedRef.current = true;
    setPrimaryColor(color);
    setPrimaryHex(color);
  };

  const handleSecondaryColorChange = (color: string) => {
    userHasInteractedRef.current = true;
    setSecondaryColor(color);
    setSecondaryHex(color);
  };

  const handlePrimaryHexInput = (value: string) => {
    setPrimaryHex(value);
    if (isValidHexColor(value)) {
      userHasInteractedRef.current = true;
      setPrimaryColor(value);
    }
  };

  const handleSecondaryHexInput = (value: string) => {
    setSecondaryHex(value);
    if (isValidHexColor(value)) {
      userHasInteractedRef.current = true;
      setSecondaryColor(value);
    }
  };

  const handleSave = async () => {
    if (!sessionToken) return;
    setSaving(true);
    try {
      await saveSettings(sessionToken, { primaryColor, secondaryColor });
      toast.success(t('admin.appearance.saved'));
      backgroundPush(sessionToken);
    } catch {
      toast.error(t('admin.appearance.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // ── Logo handlers para LogoUploader ──────────────────────────────────────────

  const handleLogoUpload = async (bytes: Uint8Array, fileName: string) => {
    if (!sessionToken) return;
    await uploadLogoFromBytes(sessionToken, bytes, fileName);
    backgroundPush(sessionToken);
  };

  const handleRemoveLogo = async () => {
    if (!sessionToken) return;
    await removeLogo(sessionToken);
    backgroundPush(sessionToken);
  };

  const primaryPalette = generatePalette(primaryColor);
  const secondaryPalette = generatePalette(secondaryColor);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('admin.appearance.title')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('admin.appearance.subtitle')}
        </p>
      </div>

      {/* Color Primario */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('admin.appearance.primaryColor')}</h3>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => handlePrimaryColorChange(e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600"
          />
          <div className="w-36">
            <Input
              value={primaryHex}
              onChange={(e) => handlePrimaryHexInput(e.target.value)}
              placeholder="#1e3a5f"
              className={!isValidHexColor(primaryHex) && primaryHex.length > 0 ? 'error' : ''}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => { userHasInteractedRef.current = true; handlePrimaryColorChange(DEFAULT_APP_SETTINGS.primaryColor); }}>
            <RotateCcw size={16} />
            {t('admin.appearance.reset')}
          </Button>
        </div>
        <div className="flex gap-2 mb-4">
          {PRIMARY_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => handlePrimaryColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                primaryColor === color ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="flex rounded-lg overflow-hidden">
          {Object.entries(primaryPalette).map(([shade, color]) => (
            <div
              key={shade}
              className="flex-1 h-10 relative group"
              style={{ backgroundColor: color }}
              title={`${shade}: ${color}`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity mix-blend-difference text-white">
                {shade}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Color Secundario */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('admin.appearance.secondaryColor')}</h3>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="color"
            value={secondaryColor}
            onChange={(e) => handleSecondaryColorChange(e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600"
          />
          <div className="w-36">
            <Input
              value={secondaryHex}
              onChange={(e) => handleSecondaryHexInput(e.target.value)}
              placeholder="#f97316"
              className={!isValidHexColor(secondaryHex) && secondaryHex.length > 0 ? 'error' : ''}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => { userHasInteractedRef.current = true; handleSecondaryColorChange(DEFAULT_APP_SETTINGS.secondaryColor); }}>
            <RotateCcw size={16} />
            {t('admin.appearance.reset')}
          </Button>
        </div>
        <div className="flex gap-2 mb-4">
          {SECONDARY_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => handleSecondaryColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                secondaryColor === color ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="flex rounded-lg overflow-hidden">
          {Object.entries(secondaryPalette).map(([shade, color]) => (
            <div
              key={shade}
              className="flex-1 h-10 relative group"
              style={{ backgroundColor: color }}
              title={`${shade}: ${color}`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity mix-blend-difference text-white">
                {shade}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Logo — usa LogoUploader (soporta remoción de fondo con imgly) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('admin.appearance.companyLogo')}</h3>
        <LogoUploader
          currentLogoUrl={settings?.logoPath}
          onUpload={handleLogoUpload}
          onRemove={handleRemoveLogo}
          disabled={isLoading}
          previewSize={96}
          label={t('admin.appearance.uploadLogo')}
          hint={t('admin.appearance.logoHint')}
        />
      </Card>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>{t('admin.appearance.note')}</strong> {t('admin.appearance.noteText')}
        </p>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          loading={saving || isLoading}
          disabled={saving || isLoading}
        >
          {t('admin.appearance.save')}
        </Button>
      </div>
    </div>
  );
}
