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
    renderApp(<AppRoutes />, { api: await signedIn(), route: '/refunds' });
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText(/processing the Google Play refund/)).toBeInTheDocument();
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
  it('shows "coming soon" for refunds on the real API without calling it', async () => {
    const api = await signedIn();
    const real = { ...api, mock: false, listRefunds: vi.fn() };
    renderApp(<AppRoutes />, { api: real, route: '/refunds' });
    expect(await screen.findByText('Coming soon: not available yet')).toBeInTheDocument();
    expect(real.listRefunds).not.toHaveBeenCalled();
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
