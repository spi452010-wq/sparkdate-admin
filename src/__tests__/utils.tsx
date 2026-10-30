import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { createMockApi } from '../api/mock';
import type { AdminApi } from '../api';

export function renderApp(ui: ReactNode, { api = createMockApi(0), route = '/' }: { api?: AdminApi; route?: string } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { api, ...render(
    <QueryClientProvider client={qc}><MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider api={api}>{ui}</AuthProvider></MemoryRouter></QueryClientProvider>,
  ) };
}
