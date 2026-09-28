import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EditTaskForm from './EditTaskForm';
import type { Task } from './task.types';

const task = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Original title',
  description: 'Original description',
  status: 'todo',
  createdAt: '2026-09-19T10:00:00.000Z',
  updatedAt: '2026-09-19T10:00:00.000Z',
} satisfies Task;

describe('EditTaskForm', () => {
  it('submits normalized details and clears the description', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<EditTaskForm task={task} onCancel={vi.fn()} onSave={onSave} />);

    const titleInput = screen.getByRole('textbox', {
      name: 'Title',
    });

    const descriptionInput = screen.getByRole('textbox', {
      name: 'Description',
    });

    expect(titleInput).toHaveValue('Original title');
    expect(descriptionInput).toHaveValue('Original description');

    await user.clear(titleInput);
    await user.type(titleInput, '  Updated title  ');
    await user.clear(descriptionInput);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSave).toHaveBeenCalledOnce();

    expect(onSave).toHaveBeenCalledWith({
      title: 'Updated title',
      description: null,
    });
  });
});
