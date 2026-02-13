import { useForm, type FieldValues, type UseFormRegister, type UseFormWatch, type UseFormSetValue, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type LucideIcon } from 'lucide-react';
import { useModalStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui';
import type { z } from 'zod';

export type MovementDirection = 'entry' | 'exit';

interface MovementFormTabProps<TForm extends FieldValues> {
  direction: MovementDirection;
  /** Zod schema for the form */
  schema: z.ZodType<TForm>;
  /** Default values for the form */
  defaultValues: TForm;
  /** Label shown in the info banner */
  bannerText: string;
  /** Icon shown next to the quantity input and submit button */
  icon: LucideIcon;
  /** Success toast message */
  successMessage: string;
  /** Error toast message */
  errorMessage: string;
  /** Submit button label (while idle) */
  submitLabel: string;
  /** Submit button label (while loading) */
  loadingLabel?: string;
  /** Async function that performs the API call. Receives sessionToken and validated data. */
  onSubmit: (sessionToken: string, data: TForm) => Promise<void>;
  /** Called after a successful submission */
  onSuccess?: () => void;
  /** Render the form fields. Receives register, errors, watch, setValue from useForm. */
  renderFields: (form: {
    register: UseFormRegister<TForm>;
    errors: FieldErrors<TForm>;
    watch: UseFormWatch<TForm>;
    setValue: UseFormSetValue<TForm>;
  }) => React.ReactNode;
}

export function MovementFormTab<TForm extends FieldValues>({
  direction,
  schema,
  defaultValues,
  bannerText,
  icon: Icon,
  successMessage,
  errorMessage,
  submitLabel,
  loadingLabel = 'Registrando...',
  onSubmit,
  onSuccess,
  renderFields,
}: MovementFormTabProps<TForm>) {
  const sessionToken = useAuthStore((s) => s.sessionToken);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<TForm>({
    resolver: zodResolver(schema as any) as Resolver<TForm>,
    defaultValues: defaultValues as any,
  });

  const isEntry = direction === 'entry';
  const bannerColor = isEntry
    ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400'
    : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400';
  const buttonColor = isEntry ? 'bg-green-500!' : 'bg-red-500!';

  const handleFormSubmit = async (data: TForm) => {
    if (!sessionToken) return;
    try {
      await onSubmit(sessionToken, data);
      toast.success(successMessage);
      onSuccess?.();
    } catch (error) {
      console.error(`Error: ${errorMessage}`, error);
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className={`p-4 rounded-lg mb-4 ${bannerColor}`}>
        <p className="text-sm">{bannerText}</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {renderFields({ register, errors, watch, setValue })}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={() => useModalStore.getState().closeModal()}
          variant="outline"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          icon={<Icon size={16} />}
          className={buttonColor}
        >
          {isSubmitting ? loadingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
