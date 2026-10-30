import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from '../components/Table';
import { ConfirmDialog } from '../components/Modal';
import { Button, EmptyState, ErrorState, Field, StatusBadge } from '../components/ui';

describe('UI components', () => {
  it('Table renders headers and rows', () => {
    render(<Table caption="People" rows={[{ id: '1', n: 'Diya' }]} columns={[{ key: 'n', header: 'Name', render: (r) => r.n }]} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Diya' })).toBeInTheDocument();
  });
  it('Field links label and error', () => {
    render(<Field label="Email" error="Required"><input /></Field>);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required');
  });
  it('Button shows loading and is disabled', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
  it('ConfirmDialog confirms, cancels and closes on Escape', async () => {
    const onConfirm = vi.fn(), onCancel = vi.fn();
    render(<ConfirmDialog open title="Block user?" message="Sure?" confirmLabel="Block" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('dialog', { name: 'Block user?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Block' })); expect(onConfirm).toHaveBeenCalled();
    await userEvent.keyboard('{Escape}'); expect(onCancel).toHaveBeenCalled();
  });
  it('ErrorState retries; EmptyState and StatusBadge render', async () => {
    const retry = vi.fn();
    render(<><ErrorState error={new Error('Boom')} onRetry={retry} /><EmptyState title="No events" /><StatusBadge status="not_submitted" /></>);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' })); expect(retry).toHaveBeenCalled();
    expect(screen.getByText('No events')).toBeInTheDocument(); expect(screen.getByText('not submitted')).toBeInTheDocument();
  });
});
