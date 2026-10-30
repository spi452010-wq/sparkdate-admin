import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';
import { PLAY_PRODUCTS, type EventInput } from '../../api/types';
import { MAX_TOTAL_CAPACITY, toEventInput, validateEvent, type EventFormErrors, type EventFormValues } from './validation';

export function EventForm({ initial, submitLabel, onSubmit, allowPast }: {
  initial: EventFormValues; submitLabel: string; onSubmit: (input: EventInput) => Promise<unknown>; allowPast?: boolean;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof EventFormValues>(k: K, val: EventFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const total = (Number(v.boysCapacity) || 0) + (Number(v.girlsCapacity) || 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validateEvent(v, new Date(), { allowPast });
    setErrors(errs); setSubmitError(null);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try { await onSubmit(toEventInput(v)); }
    catch (err) { setSubmitError(err instanceof Error ? err.message : 'Could not save event'); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} noValidate className="card form" aria-label="Event form">
      {submitError ? <Notice kind="error">{submitError}</Notice> : null}
      <Field label="Title" error={errors.title}><input value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={80} /></Field>
      <Field label="Description" error={errors.description}><textarea rows={3} value={v.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="grid2">
        <Field label="Date" error={errors.date}><input type="date" value={v.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Start time" error={errors.time}><input type="time" value={v.time} onChange={(e) => set('time', e.target.value)} /></Field>
      </div>
      <Field label="Round duration (minutes)" error={errors.roundMinutes}><input inputMode="numeric" value={v.roundMinutes} onChange={(e) => set('roundMinutes', e.target.value)} /></Field>
      <fieldset>
        <legend>Seats</legend>
        <div className="grid2">
          <Field label="Boys capacity" error={errors.boysCapacity}><input inputMode="numeric" value={v.boysCapacity} onChange={(e) => set('boysCapacity', e.target.value)} /></Field>
          <Field label="Girls capacity" error={errors.girlsCapacity}><input inputMode="numeric" value={v.girlsCapacity} onChange={(e) => set('girlsCapacity', e.target.value)} /></Field>
        </div>
        <p className="muted" aria-live="polite">Total: {total} / {MAX_TOTAL_CAPACITY}</p>
        {errors.capacity ? <small className="error" role="alert">{errors.capacity}</small> : null}
      </fieldset>
      <fieldset>
        <legend>Pricing</legend>
        <label className="radio"><input type="radio" name="pricing" checked={!v.isPaid} onChange={() => set('isPaid', false)} /> Free</label>
        <label className="radio"><input type="radio" name="pricing" checked={v.isPaid} onChange={() => set('isPaid', true)} /> Paid</label>
        {v.isPaid ? <Field label="Price (INR)" error={errors.priceInr}><input inputMode="numeric" value={v.priceInr} onChange={(e) => { const p = e.target.value; setV((o) => ({ ...o, priceInr: p, playProductId: !o.playProductId || /^event_ticket_\d*$/.test(o.playProductId) ? `event_ticket_${p}` : o.playProductId })); }} /></Field> : null}
        {v.isPaid ? (
          <Field label="Google Play product ID" error={errors.playProductId} hint="Must match an in-app product in Play Console">
            <input list="play-products" value={v.playProductId} onChange={(e) => set('playProductId', e.target.value)} />
          </Field>
        ) : null}
        <datalist id="play-products">{PLAY_PRODUCTS.map((p) => <option key={p} value={p} />)}</datalist>
      </fieldset>
      <div className="row end"><Button type="submit" loading={saving}>{submitLabel}</Button></div>
    </form>
  );
}
