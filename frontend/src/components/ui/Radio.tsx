import { clsx } from 'clsx';
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Radio({ label, id, className, ...props }: RadioProps) {
  const generatedId = useId();
  const radioId = id ?? generatedId;

  return (
    <div className="flex items-center gap-2">
      <input
        id={radioId}
        type="radio"
        className={clsx(
          'h-4 w-4 border-line-strong accent-accent focus:ring-2 focus:ring-accent',
          className,
        )}
        {...props}
      />
      <label htmlFor={radioId} className="text-sm text-ink-muted">
        {label}
      </label>
    </div>
  );
}
