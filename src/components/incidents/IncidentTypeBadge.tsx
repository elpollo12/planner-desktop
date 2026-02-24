import { Badge } from '../ui';
import type { BadgeVariant } from '../ui';

interface IncidentTypeBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
}

const VALID_VARIANTS: string[] = ['gray', 'blue', 'green', 'yellow', 'red', 'purple', 'orange'];

export function IncidentTypeBadge({ name, color, size = 'sm' }: IncidentTypeBadgeProps) {
  const variant = VALID_VARIANTS.includes(color) ? color : 'gray';

  return (
    <Badge variant={variant as BadgeVariant} size={size}>
      {name}
    </Badge>
  );
}
