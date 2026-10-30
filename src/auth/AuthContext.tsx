import { createContext, useContext, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/http';
import type { AdminApi } from '../api';
import type { AdminUser } from '../api/types';

interface AuthState {
  user: AdminUser | null; loading: boolean;
  login(email: string, password: string): Promise<AdminUser>;
  logout(): Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);
const ApiCtx = createContext<AdminApi | null>(null);

export function AuthProvider({ api, children }: { api: AdminApi; children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => { try { return await api.me(); } catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e; } },
    retry: false, staleTime: 5 * 60_000,
  });
  const loginM = useMutation({ mutationFn: (v: { email: string; password: string }) => api.login(v.email, v.password), onSuccess: (u) => qc.setQueryData(['me'], u) });
  const value: AuthState = {
    user: me.data ?? null, loading: me.isLoading,
    login: (email, password) => loginM.mutateAsync({ email, password }),
    logout: async () => { await api.logout(); qc.clear(); qc.setQueryData(['me'], null); },
  };
  return <ApiCtx.Provider value={api}><Ctx.Provider value={value}>{children}</Ctx.Provider></ApiCtx.Provider>;
}
export function useAuth() { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside AuthProvider'); return c; }
export function useApi() { const c = useContext(ApiCtx); if (!c) throw new Error('useApi outside AuthProvider'); return c; }
