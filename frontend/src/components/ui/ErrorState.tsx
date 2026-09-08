import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

import { Alert } from './Alert.tsx';
import { Button } from './Button.tsx';

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  message: string;
  title?: string;
  code?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Renders a plain-language failure message via `Alert` (which already carries
 * `role="alert"` for AT announcement). `code`, if given, is always shown
 * alongside `message` — never in place of it — per AC4.
 */
export function ErrorState({
  message,
  title = 'Something went wrong',
  code,
  onRetry,
  retryLabel = 'Try again',
  className,
  ...props
}: ErrorStateProps) {
  return (
    <Alert variant="danger" title={title} className={clsx('flex flex-col items-start gap-3', className)} {...props}>
      <p>{message}</p>
      {code ? <p className="text-xs text-red-700/70">Error code: {code}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </Alert>
  );
}
