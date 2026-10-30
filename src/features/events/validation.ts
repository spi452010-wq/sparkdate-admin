import type { EventInput, SpeedEvent } from '../../api/types';

export interface EventFormValues {
  title: string; description: string; date: string; time: string; roundMinutes: string;
  boysCapacity: string; girlsCapacity: string; isPaid: boolean; priceInr: string; playProductId: string;
}
export type EventFormErrors = Partial<Record<keyof EventFormValues | 'capacity', string>>;
export const MAX_TOTAL_CAPACITY = 300;
const PRODUCT_RE = /^[a-z0-9][a-z0-9._]{0,98}[a-z0-9]$/;
const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

export function validateEvent(v: EventFormValues, now = new Date(), opts: { allowPast?: boolean } = {}): EventFormErrors {
  const e: EventFormErrors = {};
  const t = v.title.trim();
  if (t.length < 3) e.title = 'Title must be at least 3 characters';
  else if (t.length > 80) e.title = 'Title must be 80 characters or fewer';
  if (v.description.length > 1000) e.description = 'Description must be 1000 characters or fewer';
  if (!v.date) e.date = 'Date is required';
  if (!v.time) e.time = 'Time is required';
  if (v.date && v.time && !opts.allowPast && new Date(`${v.date}T${v.time}`) <= now) e.date = 'Event must start in the future';
  const r = int(v.roundMinutes);
  if (!(r >= 1 && r <= 30)) e.roundMinutes = 'Round duration must be 1–30 minutes';
  const b = int(v.boysCapacity), g = int(v.girlsCapacity);
  if (!(b >= 1)) e.boysCapacity = 'Enter at least 1 seat';
  if (!(g >= 1)) e.girlsCapacity = 'Enter at least 1 seat';
  if (!e.boysCapacity && !e.girlsCapacity && b + g > MAX_TOTAL_CAPACITY) e.capacity = `Total seats (${b + g}) cannot exceed ${MAX_TOTAL_CAPACITY}`;
  if (v.isPaid) {
    const p = int(v.priceInr);
    if (!(p >= 1 && p <= 100000)) e.priceInr = 'Enter a whole price between ₹1 and ₹1,00,000';
    if (!PRODUCT_RE.test(v.playProductId.trim())) e.playProductId = 'Enter the Google Play product ID (lowercase, e.g. event_ticket_199)';
  }
  return e;
}

export function toEventInput(v: EventFormValues): EventInput {
  return {
    title: v.title.trim(), description: v.description.trim(),
    startsAt: new Date(`${v.date}T${v.time}`).toISOString(), roundMinutes: Number(v.roundMinutes),
    capacity: { male: Number(v.boysCapacity), female: Number(v.girlsCapacity) },
    priceInPaise: v.isPaid ? Number(v.priceInr) * 100 : 0, playProductId: v.isPaid ? v.playProductId.trim() : null,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
export const emptyEventValues = (): EventFormValues => ({
  title: '', description: '', date: '', time: '19:00', roundMinutes: '3',
  boysCapacity: '150', girlsCapacity: '150', isPaid: false, priceInr: '', playProductId: '',
});
export function eventToValues(ev: SpeedEvent): EventFormValues {
  const d = new Date(ev.startsAt);
  return {
    title: ev.title, description: ev.description,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    roundMinutes: String(ev.roundMinutes), boysCapacity: String(ev.capacity.male), girlsCapacity: String(ev.capacity.female),
    isPaid: ev.priceInPaise > 0, priceInr: ev.priceInPaise > 0 ? String(ev.priceInPaise / 100) : '', playProductId: ev.playProductId ?? '',
  };
}
