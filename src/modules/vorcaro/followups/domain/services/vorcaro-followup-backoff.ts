const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Dias até o próximo lembrete com base no checkCount após o envio. */
export function getFollowUpBackoffDays(checkCountAfterReminder: number): number {
  if (checkCountAfterReminder <= 0) return 1;
  if (checkCountAfterReminder === 1) return 3;
  return 7;
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

export function computeInitialNextCheckAt(now: Date): Date {
  return addDays(now, getFollowUpBackoffDays(0));
}

export function computeNextCheckAtAfterReminder(now: Date, checkCountAfterReminder: number): Date {
  return addDays(now, getFollowUpBackoffDays(checkCountAfterReminder));
}
