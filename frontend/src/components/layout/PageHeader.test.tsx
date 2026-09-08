import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the title as the page heading', () => {
    render(<PageHeader title="Recipe Box" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Recipe Box' })).toBeInTheDocument();
  });

  it('renders actions when given, and omits the slot when not', () => {
    const { rerender } = render(<PageHeader title="Recipe Box" actions={<button>Add recipe</button>} />);
    expect(screen.getByRole('button', { name: 'Add recipe' })).toBeInTheDocument();

    rerender(<PageHeader title="Recipe Box" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
