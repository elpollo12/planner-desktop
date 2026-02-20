import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  allowSubmitOnEnter?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', allowSubmitOnEnter = false, onKeyDown, ...props }, ref) => {
    const baseInputStyles = `
      w-full px-3 py-2.5
      bg-gray-50 dark:bg-gray-800
      border rounded-lg
      text-gray-900 dark:text-gray-100 text-sm
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
      disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed
    `;

    const errorStyles = error
      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !allowSubmitOnEnter) {
        e.preventDefault();
        const form = e.currentTarget.form;
        if (form) {
          const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
          const currentIndex = inputs.indexOf(e.currentTarget);
          const nextInput = inputs[currentIndex + 1] as HTMLElement;
          if (nextInput && (nextInput instanceof HTMLInputElement || 
              nextInput instanceof HTMLSelectElement || 
              nextInput instanceof HTMLTextAreaElement)) {
            nextInput.focus();
          }
        }
      }
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`${baseInputStyles} ${errorStyles} ${className}`}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
