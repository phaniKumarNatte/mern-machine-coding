const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

/** "2026-01-15T10:30:00.000Z" -> "Jan 15, 2026" */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}
