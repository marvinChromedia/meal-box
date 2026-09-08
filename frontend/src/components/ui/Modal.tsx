import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-md rounded-card bg-surface p-6 shadow-soft"
      >
        <h2 id="modal-title" className="font-display text-lg font-semibold text-ink">
          {title}
        </h2>
        <div className="mt-3 text-sm text-ink-muted">{children}</div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-subtle hover:text-ink-muted"
          aria-label="Close"
        >
          &#x2715;
        </button>
      </div>
    </div>
  );
}
