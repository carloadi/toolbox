// Exact SI definitions: US gallon = 231 cubic inches; inch = 0.0254 m.
// Imperial gallon = exactly 4.54609 litres. All factors are litres/second.
export const units = [
  { id: "lmin", label: "L/min", name: "Litres per minute", factor: 1 / 60 },
  { id: "ls", label: "L/s", name: "Litres per second", factor: 1 },
  {
    id: "m3h",
    label: "m³/h",
    name: "Cubic metres per hour",
    factor: 1000 / 3600,
  },
  {
    id: "m3day",
    label: "m³/day",
    name: "Cubic metres per day",
    factor: 1000 / 86400,
  },
  {
    id: "usgpm",
    label: "US GPM",
    name: "US gallons per minute",
    factor: 3.785411784 / 60,
  },
  {
    id: "impgpm",
    label: "Imperial GPM",
    name: "Imperial gallons per minute",
    factor: 4.54609 / 60,
  },
] as const;
export type Unit = (typeof units)[number]["id"];
export const factor = (unit: Unit) => units.find((u) => u.id === unit)!.factor;
export const convert = (value: number, from: Unit, to: Unit) =>
  (value * factor(from)) / factor(to);
export function parseFlow(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
export function range(start: number, end: number, step: number): number[] {
  if (
    ![start, end, step].every(Number.isFinite) ||
    start < 0 ||
    end < start ||
    step <= 0
  )
    throw Error(
      "Use non-negative start and end, end ≥ start, and a positive step.",
    );
  const count = Math.floor((end - start) / step + 1e-10) + 1;
  if (count > 1000)
    throw Error("Limit ranges to 1,000 rows. Increase the step.");
  return Array.from({ length: count }, (_, i) => start + i * step);
}
export function format(value: number, precision: number): string {
  return Number.isFinite(value) ? value.toFixed(precision) : "Out of range";
}
export function tableText(
  rows: number[],
  unit: Unit,
  precision: number,
  separator = "\t",
): string {
  return [
    units.map((u) => u.label).join(separator),
    ...rows.map((value) =>
      units
        .map((u) => format(convert(value, unit, u.id), precision))
        .join(separator),
    ),
  ].join("\r\n");
}
