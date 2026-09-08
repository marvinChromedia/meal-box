import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from './Checkbox.tsx';

describe('Checkbox', () => {
  it('renders a small checkbox by default', () => {
    render(<Checkbox label="Mark as favorite" />);
    expect(screen.getByRole('checkbox')).toHaveClass('h-4', 'w-4');
  });

  it('renders a larger checkbox for size="lg"', () => {
    render(<Checkbox label="Milk" size="lg" />);
    expect(screen.getByRole('checkbox')).toHaveClass('h-6', 'w-6');
  });
});
