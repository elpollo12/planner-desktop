import { forwardRef, useState, useEffect } from 'react';
import { Input } from './Input';

interface DateInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  value?: string; // yyyy-mm-dd format from form
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * DateInput component that displays and accepts dates in dd/mm/yyyy format
 * but works with yyyy-mm-dd internally for database compatibility
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ label, error, helperText, required, value, onChange, disabled, className }, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    // Convert yyyy-mm-dd to dd/mm/yyyy for display
    useEffect(() => {
      if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = value.split('-');
        setDisplayValue(`${day}/${month}/${year}`);
      } else if (!value) {
        setDisplayValue('');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value.replace(/[^\d/]/g, ''); // Only digits and slashes

      // Auto-add slashes as user types
      if (input.length >= 2 && input.charAt(2) !== '/') {
        input = input.substring(0, 2) + '/' + input.substring(2);
      }
      if (input.length >= 5 && input.charAt(5) !== '/') {
        input = input.substring(0, 5) + '/' + input.substring(5);
      }

      // Limit to 10 characters (dd/mm/yyyy)
      input = input.substring(0, 10);

      setDisplayValue(input);

      // If we have a complete date, validate and convert to yyyy-mm-dd
      if (input.length === 10) {
        const parts = input.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);

          // Basic validation
          if (
            day >= 1 && day <= 31 &&
            month >= 1 && month <= 12 &&
            year >= 1900 && year <= 2100
          ) {
            // Convert to yyyy-mm-dd format
            const isoDate = `${year}-${parts[1]}-${parts[0]}`;
            onChange?.(isoDate);
          }
        }
      } else if (input.length === 0) {
        // Clear the value if input is empty
        onChange?.('');
      }
    };

    return (
      <Input
        ref={ref}
        label={label}
        error={error}
        helperText={helperText}
        required={required}
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder="dd/mm/yyyy"
        disabled={disabled}
        className={className}
        maxLength={10}
      />
    );
  }
);

DateInput.displayName = 'DateInput';
