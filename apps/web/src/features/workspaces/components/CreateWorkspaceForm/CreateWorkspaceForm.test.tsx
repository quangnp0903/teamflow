import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CreateWorkspaceForm from './CreateWorkspaceForm';

describe('CreateWorkspaceForm', () => {
  it('submits a trimmed name and clears the form after success', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<CreateWorkspaceForm onCreate={onCreate} />);

    const nameInput = screen.getByRole('textbox', {
      name: 'Workspace name',
    });

    await user.type(nameInput, '  Product team  ');
    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        name: 'Product team',
      });
      expect(nameInput).toHaveValue('');
    });

    expect(onCreate).toHaveBeenCalledOnce();
  });

  it('rejects a whitespace-only name with an accessible error', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<CreateWorkspaceForm onCreate={onCreate} />);

    const nameInput = screen.getByRole('textbox', {
      name: 'Workspace name',
    });

    await user.type(nameInput, '   ');
    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a workspace name'
    );

    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAccessibleDescription('Enter a workspace name');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('preserves the name after failure and allows a successful retry', async () => {
    const user = userEvent.setup();
    const onCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error('Workspace could not be saved'))
      .mockResolvedValue(undefined);

    render(<CreateWorkspaceForm onCreate={onCreate} />);

    const nameInput = screen.getByRole('textbox', {
      name: 'Workspace name',
    });

    await user.type(nameInput, 'Product team');
    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Workspace could not be saved'
    );
    expect(nameInput).toHaveValue('Product team');

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create workspace' })
      ).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    expect(onCreate).toHaveBeenCalledTimes(2);
    expect(onCreate).toHaveBeenLastCalledWith({
      name: 'Product team',
    });
  });
});
