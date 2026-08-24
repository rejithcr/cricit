import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { AppSession, AppUser } from '../services/auth/types';
import { authService } from '../services/auth';

interface AuthContextValue {
  /** The currently authenticated user, or null. */
  readonly user: AppUser | null;
  /** The current session, or null. */
  readonly session: AppSession | null;
  /** True while the initial session is being loaded from storage. */
  readonly isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provides authentication state to the component tree.
 *
 * Listens to auth state changes via the adapter so the UI
 * reacts automatically to login / logout / token refresh events.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialSession();

    const { unsubscribe } = authService.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return unsubscribe;
  }, []);

  async function loadInitialSession() {
    const { session: existingSession } = await authService.getSession();
    setSession(existingSession);
    setIsLoading(false);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the auth context.
 * Throws if used outside of an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
