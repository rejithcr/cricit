import { SupabaseAuthAdapter } from './SupabaseAuthAdapter';
import type { IAuthService } from './types';

/**
 * The application-wide auth service instance.
 *
 * To switch providers, replace the adapter here — no other file needs to change.
 */
export const authService: IAuthService = new SupabaseAuthAdapter();

export type { IAuthService, AuthResult, AuthError, AuthStateChangeCallback } from './types';
