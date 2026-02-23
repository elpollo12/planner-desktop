import { Badge } from '../ui';
import type { BadgeVariant } from '../ui';
import type { IncidentType } from '../../types/incident';
import { INCIDENT_TYPE_LABELS, INCIDENT_TYPE_COLORS } from '../../types/incident';

interface IncidentTypeBadgeProps {
  type: IncidentType;
  size?: 'sm' | 'md';
}

export function IncidentTypeBadge({ type, size = 'sm' }: IncidentTypeBadgeProps) {
  const color = INCIDENT_TYPE_COLORS[type] ?? 'gray';
  const label = INCIDENT_TYPE_LABELS[type] ?? type;

  return (
    <Badge variant={color as BadgeVariant} size={size}>
      {label}
    </Badge>
  );
}
