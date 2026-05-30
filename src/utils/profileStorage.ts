import type { UserProfile } from '../types/profile';

const KEY = 'user_profile';

/** Read user profile from localStorage */
export function getProfile(): UserProfile | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as UserProfile) : null;
  } catch {
    return null;
  }
}

/** Persist user profile to localStorage */
export function saveProfile(profile: UserProfile): void {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* quota exceeded or unavailable */ }
}

/** Check whether a valid profile exists */
export function hasProfile(): boolean {
  return !!getProfile()?.nickname;
}

/** Remove user profile from localStorage */
export function resetProfile(): void {
  localStorage.removeItem(KEY);
}
