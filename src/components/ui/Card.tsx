import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  noPadding?: boolean;
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200
        shadow-sm
        ${noPadding ? '' : 'p-6'}
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className={noPadding ? 'px-6 pt-6 pb-4' : 'mb-4'}>
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
