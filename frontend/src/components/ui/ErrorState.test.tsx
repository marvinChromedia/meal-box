import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './ErrorState.tsx';

describe('ErrorState', () => {
  it('displays the plain-language message and is announced as an alert', () => {
    render(<ErrorState message="Couldn't reach the server. Check your connection." />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("Couldn't reach the server. Check your connection.");
  });

  it('fires the retry action when its button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Something failed." onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no retry button when onRetry is not provided', () => {
    render(<ErrorState message="Something failed." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the error code alongside the message, never in place of it', () => {
    render(<ErrorState message="Recipe not found." code="NOT_FOUND" />);

    expect(screen.getByText('Recipe not found.')).toBeInTheDocument();
    expect(screen.getByText('Error code: NOT_FOUND')).toBeInTheDocument();
  });
});
