export function dateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
