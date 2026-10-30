import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockApi } from '../api/mock';
import { ApiError } from '../api/http';
import { AppRoutes } from '../App';
import { renderApp } from './utils';

async function signedIn() { const api = createMockApi(0); await api.login('admin@sparkdate.in', 'correct-horse-12'); return api; }

describe('pages (mock API)', () => {
  it('login flow lands on dashboard with counts', async () => {
    renderApp(<AppRoutes />, { route: '/login' });
    await userEvent.type(await screen.findByLabelText('Email'), 'admin@sparkdate.in');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse-12');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByText('Pending verifications')).toBeInTheDocument();
  });
  it('events list shows seats booked vs capacity and filters by status', async () => {
    renderApp(<AppRoutes />, { api: await signedIn(), route: '/events' });
    expect(await screen.findByText('112 / 150')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'cancelled');
    expect(await screen.findByText('No events')).toBeInTheDocument();
  });
  it('approves a pending selfie', async () => {
    renderApp(<AppRoutes />, { api: await signedIn(), route: '/users' });
    await userEvent.click(await screen.findByRole('button', { name: 'Review selfie of Aarav Shah' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Selfie approved for Aarav Shah')).toBeInTheDocument();
  });
  it('shows an error state with retry when the API fails', async () => {
    const api = await signedIn();
    api.listRefunds = async () => { throw new Error('Network down'); };
    renderApp(<AppRoutes />, { api, route: '/refunds' });
    expect(await screen.findByText('Network down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
  it('approves a refund request (Play refund processed by server)', async () => {
    const api = await signedIn();
    renderApp(<AppRoutes />, { api, route: '/refunds' });
    await userEvent.click(await screen.findByRole('button', { name: 'Approve refund for Ananya Iyer' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText(/Refund processed for Ananya Iyer \(Google Play order GPA\.3312/)).toBeInTheDocument();
    expect((await api.listPayments({ status: 'refunded' })).items.map((p) => p.id)).toEqual(['pay_3']);
  });
  it('rejecting a refund requires a reason and sends it', async () => {
    const api = await signedIn(); const spy = vi.spyOn(api, 'rejectRefund');
    renderApp(<AppRoutes />, { api, route: '/refunds' });
    await userEvent.click(await screen.findByRole('button', { name: 'Reject refund for Ananya Iyer' }));
    const dlg = screen.getByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Reject refund' }));
    expect(within(dlg).getByText(/3 to 300 characters/)).toBeInTheDocument();
    await userEvent.type(within(dlg).getByLabelText('Reason (shown to the user)'), 'Attended all dates');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Reject refund' }));
    expect(await screen.findByText(/Refund rejected for Ananya Iyer/)).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith('bkg_9', 'Attended all dates');
  });
  it('shows REFUND_NOT_PENDING in plain words', async () => {
    const api = await signedIn(); await api.approveRefund('bkg_9');
    await expect(api.approveRefund('bkg_9')).rejects.toThrow(/already decided/);
  });
  it('payments list filters by status and shows Play fields', async () => {
    renderApp(<AppRoutes />, { api: await signedIn(), route: '/payments' });
    expect(await screen.findByText('GPA.3301-1111-2222-00002')).toBeInTheDocument();
    expect(screen.getAllByText('chat_pass_monthly').length).toBeGreaterThan(0);
    await userEvent.selectOptions(screen.getByLabelText('Payment status'), 'voided');
    expect(await screen.findByText('No purchases found')).toBeInTheDocument();
  });
  it('cancels an event after a danger confirm and shows the refund summary', async () => {
    const api = await signedIn();
    renderApp(<AppRoutes />, { api, route: '/events/evt_1' });
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel event' }));
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByText(/Paid bookings are refunded automatically/)).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Cancel event' }));
    expect(await screen.findByText(/Event cancelled\. 2 paid booking\(s\) refunded/)).toBeInTheDocument();
    expect((await api.getEvent('evt_1')).status).toBe('cancelled');
  });
  it('hosts get no Cancel event button and the API refuses them', async () => {
    const api = createMockApi(0); await api.login('host@sparkdate.in', 'correct-horse-12');
    renderApp(<AppRoutes />, { api, route: '/events/evt_1' });
    expect(await screen.findByRole('heading', { name: /Friday Night Sparks/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel event' })).not.toBeInTheDocument();
    await expect(api.cancelEvent('evt_1')).rejects.toMatchObject({ status: 403 });
  });
  it('shows the city as "City • Virtual" in the events list and detail', async () => {
    const api = await signedIn();
    const { unmount } = renderApp(<AppRoutes />, { api, route: '/events' });
    expect(await screen.findByText('Indore • Virtual')).toBeInTheDocument();
    unmount();
    renderApp(<AppRoutes />, { api, route: '/events/evt_1' });
    expect(await screen.findByText('Mumbai • Virtual')).toBeInTheDocument();
  });
  it('edit form loads the city and sends it on PATCH', async () => {
    const api = await signedIn(); const spy = vi.spyOn(api, 'updateEvent');
    renderApp(<AppRoutes />, { api, route: '/events/evt_2/edit' });
    const city = await screen.findByLabelText('City');
    expect(city).toHaveValue('Indore');
    await userEvent.clear(city); await userEvent.type(city, 'Pune');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith('evt_2', expect.objectContaining({ city: 'Pune' })));
  });
  it('mock API rejects an event without a city like the agreed contract', async () => {
    const api = await signedIn();
    await expect(api.createEvent({ title: 'No City', city: ' ', description: '', startsAt: new Date(Date.now() + 864e5).toISOString(), roundMinutes: 3, capacity: { male: 10, female: 10 }, priceInPaise: 0, playProductId: null }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
  it('payments: debounced q search syncs to the URL and shows name/phone columns', async () => {
    const api = await signedIn(); const spy = vi.spyOn(api, 'listPayments');
    renderApp(<AppRoutes />, { api, route: '/payments' });
    expect(await screen.findByText('Ananya Iyer')).toBeInTheDocument();
    expect(screen.getByText('+919800000004')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search payments'), 'diya');
    await waitFor(() => expect(screen.getByText('GPA.3301-1111-2222-00002')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Ananya Iyer')).not.toBeInTheDocument());
    expect(await screen.findAllByText('Diya Mehta')).toHaveLength(2);
    expect(screen.queryByText('Ananya Iyer')).not.toBeInTheDocument();
    // one request per settled term, not per keystroke
    expect(spy.mock.calls.filter((c) => c[0]?.status !== 'unlinked').map((c) => c[0]?.q)).toEqual([undefined, 'diya']);
  });
  it('payments: event filter and URL params restore state', async () => {
    const api = await signedIn(); const spy = vi.spyOn(api, 'listPayments');
    renderApp(<AppRoutes />, { api, route: '/payments?eventId=evt_1&q=diya' });
    expect(await screen.findByText('GPA.3301-1111-2222-00003')).toBeInTheDocument();
    expect(screen.queryByText('GPA.3301-1111-2222-00002')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Search payments')).toHaveValue('diya');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'evt_1', q: 'diya' }));
    await waitFor(() => expect(screen.getByLabelText('Event')).toHaveValue('evt_1'));
    await userEvent.selectOptions(screen.getByLabelText('Event'), '');
    expect(await screen.findByText('GPA.3301-1111-2222-00002')).toBeInTheDocument();
  });
  it('payments: falls back to the user ID when the user is missing', async () => {
    const api = await signedIn(); const real = api.listPayments.bind(api);
    api.listPayments = async (f) => { const r = await real(f); return { ...r, items: r.items.map((p) => ({ ...p, user: { id: p.userId, fullName: null, phone: null } })) }; };
    renderApp(<AppRoutes />, { api, route: '/payments' });
    expect((await screen.findAllByText('usr_02')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Diya Mehta')).not.toBeInTheDocument();
  });
  it('refunds: q search (debounced, in URL) filters by user', async () => {
    const api = await signedIn(); const spy = vi.spyOn(api, 'listRefunds');
    renderApp(<AppRoutes />, { api, route: '/refunds' });
    expect(await screen.findByText('Ananya Iyer')).toBeInTheDocument();
    expect(screen.getByText('+919800000004')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search refunds'), 'kabir');
    expect(await screen.findByText(/Nothing matches “kabir”/)).toBeInTheDocument();
    expect(spy).toHaveBeenLastCalledWith({ status: 'requested', q: 'kabir' });
  });
  it('maps USE_CANCEL_ENDPOINT to a plain message', () => {
    expect(new ApiError(409, 'USE_CANCEL_ENDPOINT', 'x').message).toMatch(/Use "Cancel event"/);
  });
  it('shows a clear message when the account is locked (429 ACCOUNT_LOCKED)', async () => {
    const api = createMockApi(0);
    api.login = async () => { throw new ApiError(429, 'ACCOUNT_LOCKED', 'locked', { retryAfterSec: 900 }); };
    renderApp(<AppRoutes />, { api, route: '/login' });
    await userEvent.type(await screen.findByLabelText('Email'), 'admin@sparkdate.in');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(/account is locked, try again in about 15 minutes/)).toBeInTheDocument();
  });
  it('maps 403 CSRF_INVALID to a refresh hint', () => {
    expect(new ApiError(403, 'CSRF_INVALID', 'x').message).toMatch(/Refresh the page/);
  });
  it('mock locks the account after 5 wrong passwords', async () => {
    const api = createMockApi(0);
    for (let i = 0; i < 5; i++) await expect(api.login('admin@sparkdate.in', 'short')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(api.login('admin@sparkdate.in', 'correct-horse-12')).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
  });
  it('shows "coming soon" for reports on the real API without calling it', async () => {
    const api = await signedIn();
    const real = { ...api, mock: false, listReports: vi.fn() };
    renderApp(<AppRoutes />, { api: real, route: '/reports' });
    expect(await screen.findByText('Coming soon: not available yet')).toBeInTheDocument();
    expect(real.listReports).not.toHaveBeenCalled();
  });
  it('host sees only own events and no stats/users', async () => {
    const api = createMockApi(0); await api.login('host@sparkdate.in', 'correct-horse-12');
    expect((await api.listEvents()).items.every((e) => e.createdBy === 'host_1')).toBe(true);
    await expect(api.stats()).rejects.toMatchObject({ status: 403 });
    renderApp(<AppRoutes />, { api, route: '/' });
    expect(await screen.findByRole('heading', { name: 'My events' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });
  it('rejects capacity below booked seats (409) and paid events without product', async () => {
    const api = await signedIn();
    await expect(api.updateEvent('evt_1', { capacity: { male: 100, female: 150 } })).rejects.toMatchObject({ status: 409, code: 'CAPACITY_BELOW_BOOKED' });
    await expect(api.updateEvent('evt_2', { priceInPaise: 19900, playProductId: null })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
  it('refetches users when a signed selfie URL fails to load', async () => {
    const api = await signedIn(); const spy = vi.spyOn(api, 'listUsers');
    renderApp(<AppRoutes />, { api, route: '/users' });
    await userEvent.click(await screen.findByRole('button', { name: 'Review selfie of Aarav Shah' }));
    const n = spy.mock.calls.length;
    fireEvent.error(screen.getByAltText('Selfie submitted by Aarav Shah'));
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(n));
  });
});
