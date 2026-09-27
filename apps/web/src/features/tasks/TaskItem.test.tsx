import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';

import TaskItem from './TaskItem';
import type { Task } from './task.types';

afterEach(() => {
  vi.restoreAllMocks();
});

const task = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Learn task updates',
  description: 'Update a task from React',
  status: 'todo',
  createdAt: '2026-09-19T10:00:00.000Z',
  updatedAt: '2026-09-19T10:00:00.000Z',
} satisfies Task;

describe('TaskItem', () => {
  it('requests the selected status change', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskItem
        task={task}
        onStatusChange={onStatusChange}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const statusSelect = screen.getByRole('combobox', {
      name: 'Status for Learn task updates',
    });

    expect(statusSelect).toHaveValue('todo');

    await user.selectOptions(statusSelect, 'in_progress');

    expect(onStatusChange).toHaveBeenCalledOnce();
    expect(onStatusChange).toHaveBeenCalledWith(task.id, 'in_progress');
  });

  it('confirms and requests task deletion', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);

    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TaskItem
        task={task}
        onDelete={onDelete}
        onStatusChange={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(confirmMock).toHaveBeenCalledWith(
      'Delete "Learn task updates"? This cannot be undone.'
    );

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(task.id);
  });
});
