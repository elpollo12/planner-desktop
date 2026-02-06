interface OilRigIconProps {
  size?: number;
  className?: string;
}

export function OilRigIcon({ size = 24, className = '' }: OilRigIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Derrick tower - triangular frame */}
      <line x1="12" y1="2" x2="6" y2="18" />
      <line x1="12" y1="2" x2="18" y2="18" />
      {/* Cross braces */}
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="7" y1="13" x2="17" y2="13" />
      {/* Base platform */}
      <line x1="4" y1="18" x2="20" y2="18" />
      {/* Ground legs */}
      <line x1="5" y1="18" x2="4" y2="22" />
      <line x1="19" y1="18" x2="20" y2="22" />
      {/* Drill string (center vertical line going down) */}
      <line x1="12" y1="8" x2="12" y2="22" />
    </svg>
  );
}
