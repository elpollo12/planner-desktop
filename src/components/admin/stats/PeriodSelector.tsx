import { useTranslation } from 'react-i18next';

interface PeriodSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const { t } = useTranslation();

  const OPTIONS = [
    { label: t('admin.periodSelector.days7'), value: 7 },
    { label: t('admin.periodSelector.days15'), value: 15 },
    { label: t('admin.periodSelector.days30'), value: 30 },
  ];

  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 transition-colors ${
            value === opt.value
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
