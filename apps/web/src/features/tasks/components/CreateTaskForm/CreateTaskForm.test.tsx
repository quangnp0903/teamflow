import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import CreateTaskForm from './CreateTaskForm';

describe('CreateTaskForm', () => {
  it('renders accessible form controls', () => {
    render(<CreateTaskForm onCreate={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'Create a task' })
    ).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument();

    expect(
      screen.getByRole('textbox', { name: 'Description' })
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Create task' })).toBeEnabled();
  });

  it('submits normalized task data and clears the form', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<CreateTaskForm onCreate={onCreate} />);

    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      '  Learn component testing  '
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      '  Test behavior from the user perspective  '
    );

    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onCreate).toHaveBeenCalledOnce();

    expect(onCreate).toHaveBeenCalledWith({
      title: 'Learn component testing',
      description: 'Test behavior from the user perspective',
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('');

      expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
        ''
      );
    });
  });

  it('shows the error and preserves the form values when creation fails', async () => {
    const user = userEvent.setup();
    const onCreate = vi
      .fn()
      .mockRejectedValue(new Error('Task could not be saved'));

    render(<CreateTaskForm onCreate={onCreate} />);

    const titleInput = screen.getByRole('textbox', { name: 'Title' });
    const descriptionInput = screen.getByRole('textbox', {
      name: 'Description',
    });

    await user.type(titleInput, 'Important task');
    await user.type(descriptionInput, 'Do not lose these details');

    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Task could not be saved'
    );

    expect(titleInput).toHaveValue('Important task');
    expect(descriptionInput).toHaveValue('Do not lose these details');

    expect(screen.getByRole('button', { name: 'Create task' })).toBeEnabled();
  });

  it('disables all form controls when disabled by the parent', () => {
    render(<CreateTaskForm disabled onCreate={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Title' })).toBeDisabled();

    expect(screen.getByRole('textbox', { name: 'Description' })).toBeDisabled();

    expect(screen.getByRole('button', { name: 'Create task' })).toBeDisabled();
  });
});
