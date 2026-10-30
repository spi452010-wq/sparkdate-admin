import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventForm } from '../features/events/EventForm';
import { emptyEventValues } from '../features/events/validation';

describe('EventForm', () => {
  it('shows field errors and does not submit invalid data', async () => {
    const onSubmit = vi.fn();
    render(<EventForm initial={emptyEventValues()} submitLabel="Create event" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create event' }));
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/at least 3 characters/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows Play product field for paid events, auto-fills it, and submits', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EventForm initial={{ ...emptyEventValues(), date: '2099-01-01' }} submitLabel="Create event" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Title'), 'Sparks Night');
    expect(screen.queryByLabelText('Google Play product ID')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Paid'));
    await userEvent.type(screen.getByLabelText('Price (INR)'), '199');
    expect(screen.getByLabelText('Google Play product ID')).toHaveValue('event_ticket_199');
    await userEvent.click(screen.getByRole('button', { name: 'Create event' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ priceInPaise: 19900, playProductId: 'event_ticket_199', capacity: { male: 150, female: 150 } }));
  });

  it('shows the total-seat error and server errors', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Capacity cannot be lower than seats already booked'));
    render(<EventForm initial={{ ...emptyEventValues(), title: 'Sparks', date: '2099-01-01', boysCapacity: '200' }} submitLabel="Save" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/cannot exceed 300/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Boys capacity')); await userEvent.type(screen.getByLabelText('Boys capacity'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/lower than seats already booked/)).toBeInTheDocument();
  });
});
