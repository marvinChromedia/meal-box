import { clsx } from 'clsx';
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Keep the label associated with the field for assistive tech, but don't reserve visual space for it — a compact field (e.g. inline in a list row) where the surrounding text already makes its purpose clear. */
  hideLabel?: boolean;
}

export function Input({ label, error, id, className, hideLabel, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'text-sm font-medium text-ink-muted'}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={clsx(
          'rounded-md border px-3 py-2 text-sm text-ink shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-accent',
          error ? 'border-red-500' : 'border-line-strong',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
