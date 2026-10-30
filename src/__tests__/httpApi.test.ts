import { httpApi } from '../api';

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('httpApi Sprint 2 wiring', () => {
  beforeEach(() => { document.cookie = 'csrf_token=tok123; path=/'; });
  afterEach(() => vi.restoreAllMocks());
  it('approve/reject/cancel POST to the contract paths with X-CSRF-Token and no Idempotency-Key', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ok({}));
    await httpApi.approveRefund('b1'); await httpApi.rejectRefund('b1', 'Not eligible'); await httpApi.cancelEvent('e1');
    const calls = f.mock.calls.map(([u, i]) => [String(u), (i as RequestInit).method, (i as RequestInit).body, (i as RequestInit).headers as Record<string, string>] as const);
    expect(calls.map((c) => [c[0], c[1]])).toEqual([['/api/v1/admin/refunds/b1/approve', 'POST'], ['/api/v1/admin/refunds/b1/reject', 'POST'], ['/api/v1/admin/events/e1/cancel', 'POST']]);
    expect(calls[1][2]).toBe(JSON.stringify({ reason: 'Not eligible' }));
    calls.forEach((c) => { expect(c[3]['X-CSRF-Token']).toBe('tok123'); expect(c[3]['Idempotency-Key']).toBeUndefined(); });
  });
  it('lists refunds and payments with contract query params', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ok({ items: [], page: 1, limit: 100, total: 0 }));
    await httpApi.listRefunds({ status: 'failed', q: 'asha 98' }); await httpApi.listPayments({ status: 'refund_failed', userId: 'u1', eventId: 'e1', q: '+9198' });
    expect(String(f.mock.calls[0][0])).toBe('/api/v1/admin/refunds?status=failed&q=asha+98&limit=100');
    expect(String(f.mock.calls[1][0])).toBe('/api/v1/admin/payments?status=refund_failed&userId=u1&eventId=e1&q=%2B9198&limit=100');
  });
  it('maps PLAY_UNAVAILABLE to a plain message', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ok({ error: { code: 'PLAY_UNAVAILABLE', message: 'x' } }, 503));
    await expect(httpApi.approveRefund('b1')).rejects.toThrow(/Google Play is not responding/);
  });
});
