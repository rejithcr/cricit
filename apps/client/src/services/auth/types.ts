/**
 * Provider-agnostic User representation.
 */
export interface AppUser {
  readonly id: string;
  readonly email?: string;
}

/**
 * Provider-agnostic Session representation.
 */
export interface AppSession {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly user: AppUser;
}

/**
 * Standardised auth events.
 */
export type AppAuthChangeEvent = 
  | 'SIGNED_IN' 
  | 'SIGNED_OUT' 
  | 'TOKEN_REFRESHED' 
  | 'USER_UPDATED' 
  | 'PASSWORD_RECOVERY';

/**
 * Represents the result of an authentication operation.
 * Provides a consistent shape regardless of the underlying auth provider.
 */
export interface AuthResult {
  readonly user: AppUser | null;
  readonly session: AppSession | null;
  readonly error: AuthError | null;
}

/**
 * Standardised auth error shape returned by all adapters.
 */
export interface AuthError {
  readonly message: string;
  readonly code?: string;
}

/**
 * Callback signature for auth state change listeners.
 */
export type AuthStateChangeCallback = (
  event: AppAuthChangeEvent,
  session: AppSession | null,
) => void;

/**
 * Auth service contract.
 *
 * Every concrete provider (Supabase, Cognito, Firebase, etc.) must
 * implement this interface so the rest of the app stays provider-agnostic.
 */
export interface IAuthService {
  /** Sign in with email + password. */
  signInWithEmail(email: string, password: string): Promise<AuthResult>;

  /** Create a new account with email + password. */
  signUpWithEmail(email: string, password: string): Promise<AuthResult>;

  /** Sign the current user out. */
  signOut(): Promise<{ error: AuthError | null }>;

  /** Retrieve the current session (may return null if not authenticated). */
  getSession(): Promise<{ session: AppSession | null; error: AuthError | null }>;

  /** Subscribe to auth state changes. Returns an unsubscribe function. */
  onAuthStateChange(callback: AuthStateChangeCallback): { unsubscribe: () => void };
}
