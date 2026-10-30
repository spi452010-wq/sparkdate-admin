import { emptyEventValues, toEventInput, validateEvent, type EventFormValues } from '../features/events/validation';

const now = new Date('2026-10-30T10:00:00');
const valid = (o: Partial<EventFormValues> = {}): EventFormValues => ({ ...emptyEventValues(), title: 'Friday Sparks', city: 'Indore', date: '2026-11-05', time: '19:00', ...o });

describe('validateEvent', () => {
  it('accepts a valid free event with default 3-minute rounds and 150+150 seats', () => {
    expect(validateEvent(valid(), now)).toEqual({});
    expect(emptyEventValues().roundMinutes).toBe('3');
  });
  it('requires a city (1-60 chars, trimmed) and sends it trimmed', () => {
    expect(validateEvent(valid({ city: '   ' }), now).city).toMatch(/City is required/);
    expect(validateEvent(valid({ city: 'x'.repeat(61) }), now).city).toMatch(/60 characters/);
    expect(validateEvent(valid({ city: 'x'.repeat(60) }), now).city).toBeUndefined();
    expect(toEventInput(valid({ city: '  Indore ' })).city).toBe('Indore');
  });
  it('requires title, date and time', () => {
    const e = validateEvent(valid({ title: ' ', date: '', time: '' }), now);
    expect(e.title).toBeDefined(); expect(e.date).toBeDefined(); expect(e.time).toBeDefined();
  });
  it('rejects past start time unless editing', () => {
    expect(validateEvent(valid({ date: '2026-10-01' }), now).date).toMatch(/future/);
    expect(validateEvent(valid({ date: '2026-10-01' }), now, { allowPast: true }).date).toBeUndefined();
  });
  it('enforces total capacity <= 300 and positive integers', () => {
    expect(validateEvent(valid({ boysCapacity: '200', girlsCapacity: '150' }), now).capacity).toMatch(/300/);
    expect(validateEvent(valid({ boysCapacity: '0' }), now).boysCapacity).toBeDefined();
    expect(validateEvent(valid({ girlsCapacity: '1.5' }), now).girlsCapacity).toBeDefined();
  });
  it('validates round duration range', () => {
    expect(validateEvent(valid({ roundMinutes: '0' }), now).roundMinutes).toBeDefined();
    expect(validateEvent(valid({ roundMinutes: '31' }), now).roundMinutes).toBeDefined();
  });
  it('paid events need a price and a Google Play product ID', () => {
    const e = validateEvent(valid({ isPaid: true, priceInr: '', playProductId: '' }), now);
    expect(e.priceInr).toBeDefined(); expect(e.playProductId).toBeDefined();
    expect(validateEvent(valid({ isPaid: true, priceInr: '199', playProductId: 'Event Ticket' }), now).playProductId).toBeDefined();
    expect(validateEvent(valid({ isPaid: true, priceInr: '199', playProductId: 'event_ticket_199' }), now)).toEqual({});
  });
  it('maps to the API shape in paise with male/female capacity', () => {
    const i = toEventInput(valid({ isPaid: true, priceInr: '199', playProductId: 'event_ticket_199' }));
    expect(i).toMatchObject({ priceInPaise: 19900, playProductId: 'event_ticket_199', roundMinutes: 3, capacity: { male: 150, female: 150 } });
    expect(toEventInput(valid())).toMatchObject({ priceInPaise: 0, playProductId: null });
  });
});
