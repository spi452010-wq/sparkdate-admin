import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { EventForm } from '../features/events/EventForm';
import { emptyEventValues, eventToValues } from '../features/events/validation';
import type { EventInput } from '../api/types';

export function EventEditPage() {
  const { id } = useParams();
  const api = useApi(); const qc = useQueryClient(); const nav = useNavigate();
  const q = useQuery({ queryKey: ['event', id], queryFn: () => api.getEvent(id!), enabled: !!id });
  const save = useMutation({
    mutationFn: (input: EventInput) => (id ? api.updateEvent(id, input) : api.createEvent(input)),
    onSuccess: (ev) => { qc.invalidateQueries({ queryKey: ['events'] }); qc.setQueryData(['event', ev.id], ev); nav(`/events/${ev.id}`, { state: { saved: true } }); },
  });
  if (!id) return <><h1>Create event</h1><EventForm initial={emptyEventValues()} submitLabel="Create event" onSubmit={save.mutateAsync} /></>;
  return (
    <>
      <h1>Edit event</h1>
      <QueryView query={q}>{(ev) => <EventForm initial={eventToValues(ev)} submitLabel="Save changes" allowPast onSubmit={save.mutateAsync} />}</QueryView>
    </>
  );
}
