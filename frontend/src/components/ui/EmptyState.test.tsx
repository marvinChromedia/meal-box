import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState.tsx';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="No recipes yet" description="Add your first recipe to get started." />);

    expect(screen.getByText('No recipes yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first recipe to get started.')).toBeInTheDocument();
  });

  it('renders a caller-provided action without requiring one', () => {
    const { rerender } = render(<EmptyState title="No recipes yet" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<EmptyState title="No recipes yet" action={<button>Add a recipe</button>} />);
    expect(screen.getByRole('button', { name: 'Add a recipe' })).toBeInTheDocument();
  });

  it('is announced to assistive technology as a status region', () => {
    render(<EmptyState title="No recipes yet" />);
    expect(screen.getByRole('status')).toHaveTextContent('No recipes yet');
  });
});
