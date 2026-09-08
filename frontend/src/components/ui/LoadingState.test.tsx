import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingState } from './LoadingState.tsx';

describe('LoadingState', () => {
  it('is announced to assistive technology as a busy status region', () => {
    render(<LoadingState label="Loading recipes…" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Loading recipes…');
  });

  it('renders the requested number of skeleton rows', () => {
    const { container } = render(<LoadingState rows={5} />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(5);
  });

  it('defaults to 3 rows and a generic label', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});
