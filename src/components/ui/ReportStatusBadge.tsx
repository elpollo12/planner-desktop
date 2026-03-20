import { CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReportStatus } from '../../types/report';

type BadgeSize = 'sm' | 'md';

interface ReportStatusBadgeProps {
  status: ReportStatus;
  size?: BadgeSize;
  className?: string;
}

const STATUS_CONFIG: Record<ReportStatus, {
  icon: typeof Clock;
  color: string;
  labelKey: string;
}> = {
  draft: {
    icon: Clock,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300',
    labelKey: 'status.draft',
  },
  submitted: {
    icon: Send,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    labelKey: 'status.submitted',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    labelKey: 'status.approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    labelKey: 'status.rejected',
  },
};

const SIZE_CLASSES: Record<BadgeSize, { badge: string; icon: number }> = {
  sm: { badge: 'px-2 py-0.5 text-xs', icon: 12 },
  md: { badge: 'px-2.5 py-1 text-xs', icon: 14 },
};

export const ReportStatusBadge = ({
  status,
  size = 'md',
  className = '',
}: ReportStatusBadgeProps) => {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CLASSES[size];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${config.color}
        ${sizeConfig.badge}
        ${className}
      `.trim()}
    >
      <Icon size={sizeConfig.icon} />
      {t(config.labelKey)}
    </span>
  );
};
