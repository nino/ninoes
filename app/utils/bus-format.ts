/**
 * Arrival-time formatting for the bus page. The page is server-rendered and then
 * hydrated, so the server and the browser must produce identical strings. With
 * the runtime's default locale and time zone they don't: the server formats in
 * en-US and UTC on Fly, while a British browser formats in en-GB and London
 * time. Locale, time zone and hour cycle are pinned here instead, and the
 * relative time is written by hand so it doesn't depend on either side's ICU.
 */

const clockFormat = new Intl.DateTimeFormat("en-GB", {
   timeZone: "Europe/London",
   hour: "2-digit",
   minute: "2-digit",
   hourCycle: "h23",
});

export function formatTimeToStation(seconds: number): string {
   if (seconds < 60) return "due";
   return `in ${Math.floor(seconds / 60)} min`;
}

export function formatExpectedArrival(iso: string): string {
   const parts = clockFormat.formatToParts(new Date(iso));
   const hour = parts.find((part) => part.type === "hour")?.value ?? "";
   const minute = parts.find((part) => part.type === "minute")?.value ?? "";
   return `${hour}:${minute}`;
}
