import { supabase } from './supabaseClient';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import type {
  IAuthService,
  AuthResult,
  AuthError,
  AuthStateChangeCallback,
  AppUser,
  AppSession,
  AppAuthChangeEvent,
} from './types';

/**
 * Maps a Supabase error object to our standardised AuthError shape.
 */
function toAuthError(error: unknown): AuthError | null {
  if (!error) return null;
  const supaError = error as { message?: string; code?: string };
  return {
    message: supaError.message ?? 'An unknown authentication error occurred.',
    code: supaError.code,
  };
}

/**
 * Maps Supabase User to our provider-agnostic AppUser.
 */
function toAppUser(user: User | null): AppUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Maps Supabase Session to our provider-agnostic AppSession.
 */
function toAppSession(session: Session | null): AppSession | null {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: toAppUser(session.user)!,
  };
}

/**
 * Maps Supabase auth events to our standardised events.
 */
function toAppAuthChangeEvent(event: AuthChangeEvent): AppAuthChangeEvent {
  switch (event) {
    case 'INITIAL_SESSION':
    case 'SIGNED_IN':
      return 'SIGNED_IN';
    case 'SIGNED_OUT':
      return 'SIGNED_OUT';
    case 'TOKEN_REFRESHED':
      return 'TOKEN_REFRESHED';
    case 'USER_UPDATED':
      return 'USER_UPDATED';
    case 'PASSWORD_RECOVERY':
      return 'PASSWORD_RECOVERY';
    default:
      return 'SIGNED_IN';
  }
}

/**
 * Supabase implementation of the IAuthService interface.
 *
 * Swap this out for CognitoAuthAdapter, FirebaseAuthAdapter, etc.
 * without touching any consumer code.
 */
export class SupabaseAuthAdapter implements IAuthService {
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: toAppUser(data.user),
      session: toAppSession(data.session),
      error: toAuthError(error),
    };
  }

  async signUpWithEmail(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return {
      user: toAppUser(data.user),
      session: toAppSession(data.session),
      error: toAuthError(error),
    };
  }

  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error: toAuthError(error) };
  }

  async getSession(): Promise<{ session: AppSession | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.getSession();
    return {
      session: toAppSession(data.session),
      error: toAuthError(error),
    };
  }

  onAuthStateChange(callback: AuthStateChangeCallback): { unsubscribe: () => void } {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(toAppAuthChangeEvent(event), toAppSession(session));
    });
    return { unsubscribe: () => data.subscription.unsubscribe() };
  }
}
