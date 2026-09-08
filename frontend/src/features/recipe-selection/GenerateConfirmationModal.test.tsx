import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GenerateConfirmationModal } from './GenerateConfirmationModal';

describe('GenerateConfirmationModal', () => {
  it('renders nothing when closed', () => {
    render(<GenerateConfirmationModal open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('describes the merge, not a wipe, when open', () => {
    render(<GenerateConfirmationModal open onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/already have a shopping list/i)).toBeInTheDocument();
    expect(screen.getByText(/corrected by hand stays as you left it/i)).toBeInTheDocument();
    expect(screen.getByText(/ticked-off items stay ticked/i)).toBeInTheDocument();
  });

  it('calls onConfirm when Generate is chosen', () => {
    const onConfirm = vi.fn();
    render(<GenerateConfirmationModal open onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Cancel is chosen', () => {
    const onCancel = vi.fn();
    render(<GenerateConfirmationModal open onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
