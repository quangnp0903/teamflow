import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RegisterForm from './RegisterForm';

describe('RegisterForm', () => {
  it('normalizes profile details without changing the password', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(<RegisterForm onRegister={onRegister} />);

    const password = '  Example password 123!  ';

    await user.type(
      screen.getByRole('textbox', { name: 'Display name' }),
      '  Alice  '
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Email' }),
      'ALICE@EXAMPLE.COM'
    );
    await user.type(screen.getByLabelText(/^Password/), password);

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(onRegister).toHaveBeenCalledOnce();
    });

    expect(onRegister).toHaveBeenCalledWith({
      displayName: 'Alice',
      email: 'alice@example.com',
      password,
    });
  });

  it('shows accessible field errors without submitting invalid input', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(<RegisterForm onRegister={onRegister} />);

    const displayNameInput = screen.getByRole('textbox', {
      name: 'Display name',
    });
    const emailInput = screen.getByRole('textbox', { name: 'Email' });
    const passwordInput = screen.getByLabelText(/^Password/);

    expect(passwordInput).toHaveAccessibleDescription('Use 15–128 characters.');

    await user.type(displayNameInput, '   ');
    await user.type(emailInput, 'not-an-email');
    await user.type(passwordInput, 'short');

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Enter a display name')).toBeInTheDocument();
    expect(
      await screen.findByText('Enter a valid email address')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Use at least 15 characters')
    ).toBeInTheDocument();

    expect(displayNameInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');

    expect(displayNameInput).toHaveAccessibleDescription(
      'Enter a display name'
    );
    expect(emailInput).toHaveAccessibleDescription(
      'Enter a valid email address'
    );
    expect(passwordInput).toHaveAccessibleDescription(
      'Use 15–128 characters. Use at least 15 characters'
    );

    expect(onRegister).not.toHaveBeenCalled();
  });

  it('shows the API error and preserves values when registration fails', async () => {
    const user = userEvent.setup();
    const onRegister = vi
      .fn()
      .mockRejectedValue(new Error('Email is already registered'));

    render(<RegisterForm onRegister={onRegister} />);

    const displayNameInput = screen.getByRole('textbox', {
      name: 'Display name',
    });
    const emailInput = screen.getByRole('textbox', { name: 'Email' });
    const passwordInput = screen.getByLabelText(/^Password/);
    const password = 'Example password 123!';

    await user.type(displayNameInput, 'Alice');
    await user.type(emailInput, 'alice@example.com');
    await user.type(passwordInput, password);

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email is already registered'
    );

    expect(displayNameInput).toHaveValue('Alice');
    expect(emailInput).toHaveValue('alice@example.com');
    expect(passwordInput).toHaveValue(password);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create account' })
      ).toBeEnabled();
    });
  });
});
