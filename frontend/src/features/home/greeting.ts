// Pure function so the time-of-day text is testable against fixed Date
// instances (TEST-250 AC5) — no test reads the real clock and asserts on
// whatever it happens to say.
export function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}
