import { clsx } from 'clsx';
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export type CheckboxSize = 'sm' | 'lg';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: string;
  /** 'lg' for a bigger tap target — e.g. a checklist used one-handed. Default 'sm'. */
  size?: CheckboxSize;
}

const SIZE_CLASSES: Record<CheckboxSize, { box: string; label: string; gap: string }> = {
  sm: { box: 'h-4 w-4', label: 'text-sm', gap: 'gap-2' },
  lg: { box: 'h-6 w-6', label: 'text-base', gap: 'gap-3' },
};

export function Checkbox({ label, id, className, size = 'sm', ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div className={clsx('flex items-center', sizeClasses.gap)}>
      <input
        id={checkboxId}
        type="checkbox"
        className={clsx(
          'shrink-0 rounded border-line-strong accent-accent focus:ring-2 focus:ring-accent',
          sizeClasses.box,
          className,
        )}
        {...props}
      />
      <label htmlFor={checkboxId} className={clsx('text-ink-muted', sizeClasses.label)}>
        {label}
      </label>
    </div>
  );
}
