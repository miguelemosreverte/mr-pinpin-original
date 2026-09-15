const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const normalize = text => text.replace(/\s+/gu, " ").trim();

async function main() {
  const base = process.env.READER_URL || "http://127.0.0.1:8767/storyboard/";
  const book = JSON.parse(fs.readFileSync(path.join(__dirname, "book.json")));
  const art = JSON.parse(fs.readFileSync(path.join(__dirname, "illustrations.json")));
  const translations = JSON.parse(fs.readFileSync(path.join(__dirname, "translations.json")));
  const assets = art.chapters["chapter-01"];
  const sceneTotal = assets.length;
  const expected = language => (language === "ru" ? art.scenes["chapter-01"] : translations["chapter-01"][language].scenes)
    .flatMap(scene => scene.paragraphs);
  const source = book.chapters[0].blocks.flat().filter(b => b.type === "text" && b.text !== "---").map(b => b.text);
  assert.equal(normalize(source.join(" ")), normalize(expected("ru").join(" ")), "Source words changed");
  const screenshots = path.join(os.tmpdir(), "pinpin-chapter-one-direct");
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of process.env.LIVE_CHECK ? [1440, 390] : [1440, 1024, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      for (const lang of ["en", "es", "ru"]) {
        await page.goto(base + "?chapter=1&lang=" + lang);
        await page.waitForSelector("#reader[aria-busy=false] article");
        await page.evaluate(() => document.querySelectorAll("img").forEach(i => i.loading = "eager"));
        await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
        assert.equal(await page.locator(".scene").count(), sceneTotal);
        assert.equal(await page.locator(".scene-art img").count(), sceneTotal);
        assert.equal(await page.locator("dialog,details").count(), 0, "Reader still hides content");
        assert.equal(await page.locator("#chapter-list a").count(), 38);
        assert.equal(await page.locator("html").getAttribute("lang"), lang);
        const paragraphs = await page.locator(".scene .prose p").allTextContents();
        assert.deepEqual(paragraphs, expected(lang), "Rendered translation mismatch");
        assert(await page.locator("#previous").isDisabled());
        const lastNumber = String(sceneTotal).padStart(2, "0");
        assert.equal(await page.locator(".scene-number").last().textContent(), lastNumber + " / " + lastNumber);
        assert(await page.evaluate(expected => [...document.querySelectorAll(".scene-art img")].every((image, index) =>
          image.getAttribute("src") === expected[index].src &&
          image.naturalWidth === expected[index].width && image.naturalHeight === expected[index].height
        ), assets), "Wrong artwork revision or dimensions");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Horizontal overflow");
        const collisions = await page.evaluate(() => {
          const nodes = [...document.querySelector(".toolbar").children];
          const rectangles = nodes.map(n => n.getBoundingClientRect());
          return rectangles.some((a, i) => rectangles.slice(i + 1).some(b =>
            Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
            Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
          ));
        });
        assert.equal(collisions, false, "Toolbar overlap");
        if (lang === "en") {
          await page.screenshot({ path: path.join(screenshots, "opening-" + width + ".png") });
          if ([1440, 390].includes(width)) {
            await page.screenshot({ path: path.join(screenshots, "full-" + width + ".png"), fullPage: true });
            await page.locator("#scene-6").screenshot({ path: path.join(screenshots, "circle-" + width + ".png") });
          }
        }
      }

      await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.45));
      const before = await page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight));
      // Click the visible sticky control without scrollIntoView moving the document first.
      const flag = await page.locator('[data-lang="en"]').boundingBox();
      await page.mouse.click(flag.x + flag.width / 2, flag.y + flag.height / 2);
      await page.waitForFunction(() => document.documentElement.lang === "en");
      await page.waitForTimeout(100);
      const after = await page.evaluate(() => scrollY / (document.documentElement.scrollHeight - innerHeight));
      assert(Math.abs(before - after) < 0.04, "Language switch lost reading position");
      assert(new URL(page.url()).searchParams.get("chapter") === "1");
      assert(new URL(page.url()).searchParams.get("lang") === "en");

      await page.locator("#next").click();
      await page.waitForFunction(() => new URL(location.href).searchParams.get("chapter") === "2");
      assert.equal(await page.locator(".scene").count(), 5);
      assert.equal(await page.locator(".scene-number").last().textContent(), "05 / 05");
      assert(await page.locator(".translation-notice").isVisible(), "Missing untranslated chapter notice");
      assert.equal(await page.locator("#reader article").getAttribute("lang"), "ru");
      await page.evaluate(() => history.back());
      await page.waitForFunction(() => new URL(location.href).searchParams.get("chapter") === "1");
      assert.equal(await page.locator(".scene-art img").count(), sceneTotal);

      await page.locator('#chapter-list a').last().click();
      await page.waitForFunction(() => new URL(location.href).searchParams.get("chapter") === "38");
      assert(await page.locator("#next").isDisabled());
      await page.goto(base + "?chapter=0&lang=invalid");
      await page.waitForSelector("#reader[aria-busy=false] article");
      assert.equal(new URL(page.url()).searchParams.get("chapter"), "1");
      assert.equal(new URL(page.url()).searchParams.get("lang"), "ru");
      assert.deepEqual(errors, [], "Browser script errors");
      console.log(JSON.stringify({ width, languages: 3, scenes: sceneTotal, source: true, routing: true, passed: true }));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
