// src/lib/demo-forecast.ts (demo only; real money uses decimal arithmetic on the server)

export type DemoEvent = {
  day: number;
  expectedDay?: number;
  who: string;
  amount: number;
};

export const DEMO = {
  opening: 4_380_250,
  buffer: 1_200_000,
  horizon: 30,
  events: [
    { day: 3, who: "Hamdan Textiles", amount: 624_000 },
    { day: 5, who: "Rent and utilities", amount: -185_000 },
    { day: 7, who: "Northgate Logistics", amount: 410_500 },
    { day: 9, who: "Software and subscriptions", amount: -96_400 },
    { day: 12, who: "Salma Furniture Works", amount: 287_750 },
    { day: 15, who: "Payroll", amount: -940_000 },
    { day: 17, who: "Equipment payment", amount: -3_520_000 },
    { day: 19, expectedDay: 30, who: "Crestline Packaging", amount: 520_000 },
    { day: 22, who: "Kinnaird Print House", amount: 380_500 },
  ] as DemoEvent[],
};

export function series(mode: "onTime" | "expected"): number[] {
  return Array.from({ length: DEMO.horizon + 1 }, (_, d) =>
    DEMO.events.reduce(
      (bal, e) => bal + (((mode === "expected" ? e.expectedDay ?? e.day : e.day) <= d) ? e.amount : 0),
      DEMO.opening,
    ),
  );
}

/**
 * Returns formatted date given an offset in days from the today anchor.
 * E.g. day 17 with 13 Nov anchor is "30 Nov".
 */
export function formatDemoDate(dayOffset: number, anchorDate: Date = new Date("2026-11-13T00:00:00Z")): string {
  const target = new Date(anchorDate);
  target.setDate(target.getDate() + dayOffset);
  const day = target.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[target.getMonth()];
  return `${day} ${month}`;
}
