import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  rows?: number;
}

/**
 * Renders `rows` skeleton bars reserving the same vertical space real content
 * will occupy, so content swapping in doesn't shift the layout (AC3). Callers
 * pick `rows` to roughly match what's loading (e.g. a 3-recipe skeleton for a
 * recipe list) rather than using one fixed shape everywhere.
 */
export function LoadingState({ label = 'Loading…', rows = 3, className, ...props }: LoadingStateProps) {
  return (
    <div role="status" aria-busy="true" className={clsx('flex flex-col gap-3', className)} {...props}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden="true" className="h-16 animate-pulse rounded-card bg-line" />
      ))}
    </div>
  );
}
