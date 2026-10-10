import { describe, it, expect } from "vitest";
import { convert, units, parseFlow, range, tableText } from "./flow";
describe("exact flow conversions", () => {
  it("uses exact gallon definitions and SI time factors", () => {
    expect(convert(1, "usgpm", "lmin")).toBeCloseTo(3.785411784, 10);
    expect(convert(1, "impgpm", "lmin")).toBeCloseTo(4.54609, 10);
    expect(convert(1, "ls", "m3h")).toBeCloseTo(3.6, 12);
    expect(convert(1, "ls", "m3day")).toBeCloseTo(86.4, 12);
  });
  it("round trips every unit pair without rounding intermediate values", () => {
    for (const a of units)
      for (const b of units)
        expect(convert(convert(123.456, a.id, b.id), b.id, a.id)).toBeCloseTo(
          123.456,
          10,
        );
  });
  it("accepts zero and rejects invalid values", () => {
    expect(parseFlow("0")).toBe(0);
    for (const s of ["", " ", "-1", "abc", "Infinity"])
      expect(parseFlow(s)).toBeNull();
  });
  it("generates inclusive fractional ranges and validates limits", () => {
    expect(range(0, 0.3, 0.1)).toHaveLength(4);
    expect(range(1, 1, 1)).toEqual([1]);
    for (const args of [
      [0, 2, 0],
      [2, 1, 1],
      [-1, 2, 1],
      [0, 2000, 1],
    ])
      expect(() => range(...(args as [number, number, number]))).toThrow();
  });
  it("exports all columns at requested precision with spreadsheet line endings", () => {
    const t = tableText([60], "lmin", 2);
    expect(t.split("\r\n")[1]).toBe("60.00\t1.00\t3.60\t86.40\t15.85\t13.20");
    expect(tableText([0], "ls", 0, ",").split("\r\n")[1]).toBe("0,0,0,0,0,0");
  });
});
