import type { ReactNode } from 'react';
import { useApi } from '../auth/AuthContext';
import { EmptyState } from './ui';

/** Sections whose backend API does not exist yet. Real API: show a clear notice and make no request. Mock mode: render the page. */
export function ComingSoon({ title, sprint, children }: { title: string; sprint: string; children: ReactNode }) {
  const api = useApi();
  if (api.mock) return <>{children}</>;
  return (
    <>
      <h1>{title}</h1>
      <EmptyState title="Coming soon: not available yet" message={`${title} will be enabled when the backend ships it (${sprint}). Nothing here is connected to live data yet.`} />
    </>
  );
}
