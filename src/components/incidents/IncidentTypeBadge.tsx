import { useTranslation } from 'react-i18next';
import { Badge } from '../ui';
import type { BadgeVariant } from '../ui';
import { translateIncidentTypeName } from '../../lib/translateCatalogs';

interface IncidentTypeBadgeProps {
  name: string;
  color: string;
  id?: string;
  size?: 'sm' | 'md';
}

const VALID_VARIANTS: string[] = ['gray', 'blue', 'green', 'yellow', 'red', 'purple', 'orange'];

export function IncidentTypeBadge({ name, color, id, size = 'sm' }: IncidentTypeBadgeProps) {
  const { t } = useTranslation();
  const variant = VALID_VARIANTS.includes(color) ? color : 'gray';
  const displayName = id ? translateIncidentTypeName(id, name, t) : name;

  return (
    <Badge variant={variant as BadgeVariant} size={size}>
      {displayName}
    </Badge>
  );
}
