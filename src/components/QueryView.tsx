import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { EmptyState, ErrorState, Spinner } from './ui';

/** Renders loading / error / empty / success for a query. */
export function QueryView<T>({ query, isEmpty, empty, children }: {
  query: UseQueryResult<T>; isEmpty?: (d: T) => boolean; empty?: { title: string; message?: string; action?: ReactNode };
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data as T;
  if (isEmpty?.(data)) return <EmptyState title={empty?.title ?? 'Nothing here yet'} message={empty?.message} action={empty?.action} />;
  return <>{children(data)}</>;
}
