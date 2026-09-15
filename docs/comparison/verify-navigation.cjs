const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

async function main() {
  const url = process.env.REPORT_URL || pathToFileURL(path.join(__dirname, "index.html")).href;
  const screenshots = path.join(os.tmpdir(), "pinpin-navigation");
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of process.env.REPORT_URL ? [1440, 390] : [1440, 1200, 1024, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(url);
      await page.evaluate(() => document.querySelectorAll("img").forEach(i => i.loading = "eager"));
      await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
      assert.equal(await page.locator(".report-nav a").count(), 13);
      assert(await page.evaluate(() => [...document.querySelectorAll(".report-nav a")].every(a =>
        document.getElementById(a.hash.slice(1))
      )), "Broken navigation anchor");
      await page.waitForFunction(() => document.querySelector('.report-nav [aria-current]')?.hash === "#overview");
      await page.screenshot({ path: path.join(screenshots, "overview-" + width + ".png") });

      for (const hash of ["#chapter-34", "#chapter-28"]) {
        await page.locator('.report-nav a[href="' + hash + '"]').click();
        await page.waitForFunction(hash =>
          location.hash === hash && document.querySelector('.report-nav [aria-current]')?.hash === hash, hash);
      }
      const geometry = await page.evaluate(() => {
        const nav = document.querySelector(".report-nav").getBoundingClientRect();
        const main = document.querySelector("main").getBoundingClientRect();
        const link = document.querySelector(".report-nav [aria-current]").getBoundingClientRect();
        const target = document.querySelector("#chapter-28").getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          sidebarOverlap: innerWidth >= 1200 && nav.right > main.left,
          headingHidden: innerWidth < 1200 && target.top < nav.bottom,
          activeHidden: link.left < nav.left - 1 || link.right > nav.right + 1,
          navVisible: nav.top >= 0 && nav.top < 50
        };
      });
      assert.deepEqual(geometry, {
        overflow: false, sidebarOverlap: false, headingHidden: false,
        activeHidden: false, navVisible: true
      }, "Bad navigation geometry at " + width);
      await page.screenshot({ path: path.join(screenshots, "chapter-" + width + ".png") });

      await page.evaluate(() => window.scrollTo(0,
        scrollY + document.querySelector("#chapter-32").getBoundingClientRect().top + 180));
      await page.waitForFunction(() => document.querySelector('.report-nav [aria-current]')?.hash === "#chapter-32");
      assert.equal(await page.evaluate(() => location.hash), "#chapter-28", "Scrolling rewrote browser history");
      await page.evaluate(() => history.back());
      await page.waitForFunction(() => location.hash === "#chapter-34" &&
        document.querySelector('.report-nav [aria-current]')?.hash === "#chapter-34");
      await page.locator('.report-nav a[href="#review-record"]').click();
      await page.waitForFunction(() => document.querySelector('.report-nav [aria-current]')?.hash === "#review-record");

      await page.goto(url.split("#")[0] + "#chapter-28-g");
      await page.waitForFunction(() => document.querySelector('.report-nav [aria-current]')?.hash === "#chapter-28");
      assert.deepEqual(errors, [], "Browser script errors");
      console.log(JSON.stringify({ width, navigation: true, deepLinks: true, history: true, passed: true }));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
