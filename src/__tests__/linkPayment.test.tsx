import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockApi } from '../api/mock';
import { httpApi } from '../api';
import { AppRoutes } from '../App';
import { AckDeadline } from '../features/payments/AckDeadline';
import type { PlayPayment } from '../api/types';
import { renderApp } from './utils';

async function signedIn(email = 'admin@sparkdate.in') { const api = createMockApi(0); await api.login(email, 'correct-horse-12'); return api; }
const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const base: PlayPayment = { id: 'p', userId: 'u', bookingId: null, kind: 'ticket', productId: 'x', orderId: 'o', amountInPaise: 100, status: 'unlinked', acknowledged: false, createdAt: new Date().toISOString() } as PlayPayment;

describe('link unlinked payment', () => {
  afterEach(() => vi.restoreAllMocks());
  it('httpApi POSTs {bookingId} with CSRF and maps 409 codes', async () => {
    document.cookie = 'csrf_token=tok9; path=/';
    const f = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => ok({ status: 'confirmed', booking: { id: 'b1' } }))
      .mockImplementationOnce(async () => ok({ error: { code: 'PAYMENT_NOT_UNLINKED', message: 'x' } }, 409))
      .mockImplementationOnce(async () => ok({ error: { code: 'EVENT_FULL', message: 'x' } }, 409))
      .mockImplementationOnce(async () => ok({ error: { code: 'PURCHASE_TOKEN_USED', message: 'x' } }, 409))
      .mockImplementationOnce(async () => ok({ items: [], page: 1, limit: 100, total: 0 }));
    await httpApi.linkPayment('pay 1', 'b1');
    const [u, i] = f.mock.calls[0];
    expect(String(u)).toBe('/api/v1/admin/payments/pay%201/link');
    expect((i as RequestInit).method).toBe('POST'); expect((i as RequestInit).body).toBe(JSON.stringify({ bookingId: 'b1' }));
    expect(((i as RequestInit).headers as Record<string, string>)['X-CSRF-Token']).toBe('tok9');
    await expect(httpApi.linkPayment('p', 'b')).rejects.toThrow(/already linked/);
    await expect(httpApi.linkPayment('p', 'b')).rejects.toThrow(/No seat left .* stays unlinked/);
    await expect(httpApi.linkPayment('p', 'b')).rejects.toThrow(/already used for another booking/);
    await httpApi.listUserBookings('u 1', { status: 'expired' });
    expect(String(f.mock.calls[4][0])).toBe('/api/v1/admin/users/u%201/bookings?status=expired&limit=100');
  });
  it('mock enforces server rules', async () => {
    const api = await signedIn();
    await expect(api.linkPayment('pay_5', 'bkg_1')).rejects.toMatchObject({ status: 404, code: 'BOOKING_NOT_FOUND' });
    await expect(api.linkPayment('pay_5', 'bkg_6')).rejects.toMatchObject({ status: 404, code: 'BOOKING_NOT_FOUND' }); // other product
    expect((await api.listUserBookings('usr_03')).items.map((b) => [b.id, b.event.playProductId])).toEqual([['bkg_5', 'event_ticket_199'], ['bkg_6', 'event_ticket_249']]);
    await expect(api.linkPayment('pay_1', 'bkg_5')).rejects.toMatchObject({ status: 409, code: 'PAYMENT_NOT_UNLINKED' });
    const r = await api.linkPayment('pay_5', 'bkg_5');
    expect(r.status).toBe('confirmed');
    expect((await api.listPayments({ status: 'unlinked' })).total).toBe(0);
  });
  it('ack deadline countdown: urgent under 24h, graceful when ackDeadline is null', () => {
    const { rerender } = render(<AckDeadline payment={{ ...base, ackDeadline: new Date(Date.now() + 5 * 3600_000).toISOString() }} />);
    expect(screen.getByText(/Urgent: 4h 59m left|Urgent: 5h 0m left/)).toHaveAttribute('data-urgent', 'true');
    rerender(<AckDeadline payment={{ ...base, ackDeadline: new Date(Date.now() + 71 * 3600_000 + 60_000).toISOString() }} />);
    const el = document.querySelector('.badge')!;
    expect(el.textContent).toMatch(/^2d 23h left/); expect(el).not.toHaveAttribute('data-urgent');
    rerender(<AckDeadline payment={{ ...base, ackDeadline: null }} />);
    expect(screen.getByText('Play deadline unknown')).toBeInTheDocument();
  });
  it('admin links an unlinked purchase via the dialog with confirm, toast, and badge update', async () => {
    const api = await signedIn(); const spy = vi.spyOn(api, 'linkPayment');
    renderApp(<AppRoutes />, { api, route: '/payments?status=unlinked' });
    expect(await screen.findByLabelText('1 unlinked')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Link purchase GPA\.3301-1111-2222-00005 from .* to a booking/ }));
    const dlg = screen.getByRole('dialog');
    expect(await within(dlg).findByText(/Different product \(event_ticket_249\)/)).toBeInTheDocument();
    const radios = within(dlg).getAllByRole('radio');
    expect(radios[1]).toBeDisabled(); expect(within(dlg).getByText('Product match')).toBeInTheDocument();
    expect(within(dlg).getByText(/Urgent: 1[12]h/)).toBeInTheDocument();
    await userEvent.click(radios[0]);
    await userEvent.click(within(dlg).getByRole('button', { name: 'Continue' }));
    expect(within(dlg).getByRole('alert')).toHaveTextContent(/bkg_5/);
    await userEvent.click(within(dlg).getByRole('button', { name: 'Confirm link' }));
    expect(await screen.findByText(/Linked GPA\.3301-1111-2222-00005 to booking bkg_5/)).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith('pay_5', 'bkg_5');
    await waitFor(() => expect(screen.queryByLabelText('1 unlinked')).not.toBeInTheDocument());
  });
  it('shows a clear error for a wrong manual booking ID', async () => {
    renderApp(<AppRoutes />, { api: await signedIn(), route: '/payments?status=unlinked' });
    await userEvent.click(await screen.findByRole('button', { name: /Link purchase/ }));
    const dlg = screen.getByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Continue' }));
    expect(within(dlg).getByText(/Pick one of the user's bookings/)).toBeInTheDocument();
    await userEvent.type(within(dlg).getByLabelText('Or enter booking ID'), 'bkg_1');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Continue' }));
    await userEvent.click(within(dlg).getByRole('button', { name: 'Confirm link' }));
    expect(await within(dlg).findByText(/No eligible booking/)).toBeInTheDocument();
  });
});
