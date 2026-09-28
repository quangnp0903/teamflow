import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskFilters from './TaskFilters';

describe('TaskFilters', () => {
  it('applies normalized search and status filters', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(<TaskFilters onApply={onApply} />);

    await user.type(
      screen.getByRole('searchbox', { name: 'Search' }),
      '  React API  '
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'done'
    );

    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(onApply).toHaveBeenCalledOnce();

    expect(onApply).toHaveBeenCalledWith({
      search: 'React API',
      status: 'done',
    });
  });

  it('clears draft controls and removes all applied filters', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(<TaskFilters onApply={onApply} />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Search',
    });

    const statusSelect = screen.getByRole('combobox', {
      name: 'Status',
    });

    await user.type(searchInput, 'API');
    await user.selectOptions(statusSelect, 'in_progress');

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(searchInput).toHaveValue('');
    expect(statusSelect).toHaveValue('');

    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith({});
  });
});
