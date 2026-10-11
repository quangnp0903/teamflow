import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('normalizes the email without changing the password', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue(undefined);

    render(<LoginForm onLogin={onLogin} />);

    const emailInput = screen.getByRole('textbox', { name: 'Email' });
    const passwordInput = screen.getByLabelText('Password');
    const password = '  Keep these spaces!  ';

    await user.type(emailInput, 'ALICE@EXAMPLE.COM');
    await user.type(passwordInput, password);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onLogin).toHaveBeenCalledOnce();

    expect(onLogin).toHaveBeenCalledWith({
      email: 'alice@example.com',
      password,
    });
  });

  it('shows the error and preserves credentials when login fails', async () => {
    const user = userEvent.setup();
    const onLogin = vi
      .fn()
      .mockRejectedValue(new Error('Email or password is incorrect'));

    render(<LoginForm onLogin={onLogin} />);

    const emailInput = screen.getByRole('textbox', { name: 'Email' });
    const passwordInput = screen.getByLabelText('Password');
    const password = 'Example password for testing';

    await user.type(emailInput, 'alice@example.com');
    await user.type(passwordInput, password);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password is incorrect'
    );

    expect(emailInput).toHaveValue('alice@example.com');
    expect(passwordInput).toHaveValue(password);

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
