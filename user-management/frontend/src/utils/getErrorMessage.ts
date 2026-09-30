/** Turns any thrown value into a message that is safe to show to the user. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
