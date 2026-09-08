import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon, className, ...props }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={clsx(
        'flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      {icon}
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
