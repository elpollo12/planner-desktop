import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      icon,
      iconPosition = 'left',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer';

    const variants = {
      primary:
        'bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-700 focus:ring-primary-500',
      secondary:
        'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 focus:ring-gray-400',
      danger:
        'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 focus:ring-danger-500',
      success:
        'bg-success-500 text-white hover:bg-success-600 active:bg-success-700 focus:ring-success-500',
      outline:
        'border-2 border-primary-500 text-primary-500 bg-transparent hover:bg-primary-500 hover:text-white active:bg-primary-700 focus:ring-primary-500',
      ghost:
        'text-gray-600 bg-transparent hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-400',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const iconSizes = {
      sm: 14,
      md: 16,
      lg: 20,
    };

    const renderContent = () => {
      if (loading) {
        return (
          <>
            <svg
              className="animate-spin"
              width={iconSizes[size]}
              height={iconSizes[size]}
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Cargando...</span>
          </>
        );
      }

      return (
        <>
          {icon && iconPosition === 'left' && icon}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && icon}
        </>
      );
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);

Button.displayName = 'Button';