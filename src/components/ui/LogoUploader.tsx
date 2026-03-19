/**
 * LogoUploader.tsx
 *
 * Componente genérico de carga de logo con opción de remoción de fondo.
 * Usado tanto en CompaniesManagement (logo por empresa) como en
 * AppearanceSettings (logo principal del sistema).
 *
 * Props:
 *   currentLogoUrl  — data URL del logo actual (o null/undefined si no hay)
 *   onUpload        — callback que recibe (bytes: Uint8Array, fileName: string)
 *   onRemove        — callback para eliminar el logo actual
 *   disabled?       — deshabilita la interacción (ej: mientras carga)
 *   previewSize?    — tamaño del cuadro de previsualización en px (default: 80)
 *   label?          — texto del botón de subida
 *   hint?           — texto de ayuda bajo los botones
 */

import { useState, useRef } from 'react';
import { Upload, Trash2, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { removeLogoBackground } from '@/lib/removeBackground';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = 'image/png,image/jpeg,image/svg+xml,image/webp';

export interface LogoUploaderProps {
  currentLogoUrl?: string | null;
  onUpload: (bytes: Uint8Array, fileName: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  previewSize?: number;
  label?: string;
  hint?: string;
}

export default function LogoUploader({
  currentLogoUrl,
  onUpload,
  onRemove,
  disabled = false,
  previewSize = 80,
  label = 'Subir logo',
  hint = 'PNG, JPG, SVG o WEBP · Máx. 2 MB',
}: LogoUploaderProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [removeBg, setRemoveBg] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const isBusy = processing || uploading;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input para permitir re-seleccionar el mismo archivo
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('admin.appearance.fileTooLarge'));
      return;
    }

    try {
      let bytes: Uint8Array;
      let fileName: string;

      if (removeBg) {
        setProcessing(true);
        setProgress(0);
        toast.info(t('admin.appearance.processingImage'), { toastId: 'bg-removal', autoClose: false });

        bytes = await removeLogoBackground(file, (p) => setProgress(p));
        fileName = file.name.replace(/\.[^.]+$/, '') + '_nobg.png';

        toast.dismiss('bg-removal');
        setProcessing(false);
        setProgress(null);
      } else {
        bytes = new Uint8Array(await file.arrayBuffer());
        fileName = file.name;
      }

      setUploading(true);
      await onUpload(bytes, fileName);
    } catch (err) {
      toast.dismiss('bg-removal');
      setProcessing(false);
      setProgress(null);
      console.error('[LogoUploader]', err);
      toast.error(String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    try {
      setUploading(true);
      await onRemove();
      toast.success(t('admin.appearance.logoDeleted'));
    } catch {
      toast.error(t('admin.appearance.logoDeleteError'));
    } finally {
      setUploading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex items-start gap-5">
      {/* Preview */}
      <div
        className="shrink-0 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 overflow-hidden"
        style={{ width: previewSize, height: previewSize }}
      >
        {processing ? (
          <div className="flex flex-col items-center gap-1 px-2">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            {progress !== null && (
              <span className="text-[10px] text-gray-500">
                {Math.round(progress * 100)}%
              </span>
            )}
          </div>
        ) : currentLogoUrl ? (
          <img
            src={currentLogoUrl}
            alt="Logo actual"
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-[11px] text-gray-400 text-center px-2 leading-tight">
            Sin logo
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3 flex-1 min-w-0">
        {/* Toggle remover fondo */}
        <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={removeBg}
              onChange={(e) => setRemoveBg(e.target.checked)}
              disabled={isBusy || disabled}
            />
            <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 rounded-full peer-checked:bg-blue-500 transition-colors peer-disabled:opacity-50" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <Wand2 className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Remover fondo automáticamente
          </span>
        </label>

        {/* Botones */}
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="hidden"
            disabled={isBusy || disabled}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy || disabled}
            loading={isBusy}
            icon={isBusy ? undefined : <Upload className="w-4 h-4" />}
          >
            {label}
          </Button>

          {currentLogoUrl && onRemove && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemove}
              disabled={isBusy || disabled}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Eliminar
            </Button>
          )}
        </div>

        {/* Hint */}
        <p className="text-xs text-gray-400 leading-tight">
          {hint}
          {removeBg && (
            <span className="block text-blue-500 mt-0.5">
              ⚡ {t('admin.forms.removeBgModelHint')}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
