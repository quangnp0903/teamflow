import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskPagination from './TaskPagination';

describe('TaskPagination', () => {
  it('requests the previous and next pages', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <TaskPagination
        page={2}
        total={12}
        totalPages={3}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText('Page 2 of 3 · 12 tasks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPageChange).toHaveBeenCalledTimes(2);
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('disables navigation when there is only one page', () => {
    render(
      <TaskPagination
        page={1}
        total={3}
        totalPages={1}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
