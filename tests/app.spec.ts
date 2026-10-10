import { test, expect } from "@playwright/test";
test("converter, table, preferences and exports", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Quick L/s", { exact: true }).fill("1");
  await expect(page.getByLabel("Quick m³/h", { exact: true })).toHaveValue(
    "3.60",
  );
  await page.getByLabel("Decimal places").selectOption("4");
  await expect(page.getByLabel("Quick US GPM")).toHaveValue("15.8503");
  await page.getByLabel("Quick Imperial GPM").fill("1");
  await expect(page.getByLabel("Quick L/min", { exact: true })).toHaveValue(
    "4.5461",
  );
  await page.getByLabel("Quick Imperial GPM").fill("");
  await expect(page.getByLabel("Quick L/min", { exact: true })).toHaveValue("");
  await page.getByLabel("Table input unit").selectOption("ls");
  await page.getByRole("button", { name: "Range generator" }).click();
  await page.getByLabel("Start", { exact: true }).fill("0");
  await page.getByLabel("End", { exact: true }).fill("0.3");
  await page.getByLabel("Step", { exact: true }).fill("0.1");
  await page.getByRole("button", { name: "Generate rows" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page.getByLabel("Step", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Generate rows" }).click();
  await expect(page.getByRole("status")).toContainText("positive step");
  await page.getByLabel("Flow row 1", { exact: true }).fill("-1");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  await page.getByLabel("Flow row 1", { exact: true }).fill("1");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("pumpflow-conversions.csv");
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain("L/min,L/s,m³/h,m³/day,US GPM,Imperial GPM");
  expect(csv).toContain("60.0000,1.0000,3.6000,86.4000,15.8503,13.1982");
  // Capture clipboard payload through the same button workflow, independently of OS permissions.
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Copy for Excel" }).click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toContain("60.0000\t1.0000\t3.6000");
  await page.getByLabel("Toggle color theme").click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.getByLabel("Decimal places")).toHaveValue("4");
  await expect(page.getByLabel("Table input unit")).toHaveValue("ls");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme!);
  const viewportWidth = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewportWidth);
  expect(await page.evaluate(() => window.innerWidth)).toBe(viewportWidth);
  expect(errors).toEqual([]);
});
test("production app operates offline after caching", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw Error("No active service worker");
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Flow rates, made simple." }),
  ).toBeVisible();
  await page.getByLabel("Quick L/s", { exact: true }).fill("2");
  await expect(page.getByLabel("Quick m³/h", { exact: true })).toHaveValue(
    "7.20",
  );
  await expect(page.getByText("Offline mode", { exact: true })).toBeVisible();
});
