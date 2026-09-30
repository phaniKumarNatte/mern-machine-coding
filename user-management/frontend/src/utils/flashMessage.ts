/**
 * After creating or updating a user we navigate to another page and pass a
 * one-off success message in the router's `location.state`.
 *
 * `location.state` is typed as `unknown` (anything could be in there), so we
 * narrow it safely instead of casting it.
 */
export interface FlashState {
  message: string;
}

export function getFlashMessage(state: unknown): string | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'message' in state &&
    typeof state.message === 'string'
  ) {
    return state.message;
  }
  return null;
}
