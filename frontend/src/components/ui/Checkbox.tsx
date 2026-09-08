import { clsx } from 'clsx';
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Checkbox({ label, id, className, ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className="flex items-center gap-2">
      <input
        id={checkboxId}
        type="checkbox"
        className={clsx(
          'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500',
          className,
        )}
        {...props}
      />
      <label htmlFor={checkboxId} className="text-sm text-gray-700">
        {label}
      </label>
    </div>
  );
}
