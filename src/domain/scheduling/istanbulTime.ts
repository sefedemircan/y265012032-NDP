const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function istanbulParts(date: Date): { dayOfWeek: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  let hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  if (hour === 24) hour = 0;

  return { dayOfWeek: WEEKDAYS.indexOf(weekday), minutes: hour * 60 + minute };
}

export function istanbulDateTime(dateISO: string, minuteOfDay: number): Date {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return new Date(`${dateISO}T${hh}:${mm}:00+03:00`);
}

export function formatIstanbulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function istanbulDayBounds(dateISO: string): { from: Date; to: Date } {
  return {
    from: istanbulDateTime(dateISO, 0),
    to: new Date(`${dateISO}T23:59:59+03:00`),
  };
}
