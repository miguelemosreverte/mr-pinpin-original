const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

async function main() {
  const book = JSON.parse(fs.readFileSync(path.join(__dirname, "../storyboard/book.json")));
  const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, "evidence.json")));
  assert.deepEqual(
    evidence.trials.filter(t => t.id === "e").map(t => t.chapter).sort((a, b) => a - b),
    evidence.round3.coverage,
    "Expressive E must retain round 3 coverage"
  );
  assert.deepEqual(
    evidence.trials.filter(t => t.id === "f").map(t => t.chapter).sort((a, b) => a - b),
    evidence.sourceChapters,
    "Preferred-reference F must cover every explored chapter"
  );
  assert.deepEqual(
    evidence.trials.filter(t => t.id === "g").map(t => t.chapter).sort((a, b) => a - b),
    evidence.sourceChapters,
    "Miniature G must cover every explored chapter"
  );
  assert.deepEqual(
    evidence.trials.filter(t => t.id === "c").map(t => t.chapter).sort((a, b) => a - b),
    evidence.round4.coverage,
    "C must retain round 4 coverage"
  );
  assert.equal(evidence.trials.length, 20, "Round 5 trial count");
  assert.equal(evidence.trials.reduce((sum, t) => sum + t.panels, 0), 106, "Round 5 panel count");
  for (const chapter of evidence.sourceChapters) {
    const pair = evidence.trials.filter(t => t.chapter === chapter && ["f", "g"].includes(t.id));
    assert.equal(pair.length, 2, "Missing F/G comparison for chapter " + chapter);
    assert.equal(pair[0].panels, pair[1].panels, "Mismatched F/G panel counts");
  }
  const screenshotDir = path.join(os.tmpdir(), "pinpin-round-5");
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [1440, 1024, 768, 390, 320]) {
      const page = await browser.newPage({
        viewport: { width, height: 950 },
        javaScriptEnabled: false
      });
      await page.goto(pathToFileURL(path.join(__dirname, "index.html")).href);
      await page.evaluate(() => document.querySelectorAll("img").forEach(i => i.loading = "eager"));
      await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
      const result = await page.evaluate(chapters => ({
        duplicateIds: [...document.querySelectorAll("[id]")].map(e => e.id).filter((id, i, all) => all.indexOf(id) !== i),
        pairChapters: [...document.querySelectorAll(".current-pair")].map(pair => ({
          f: pair.querySelector("[data-f-chapter]")?.dataset.fChapter,
          g: pair.querySelector("[data-g-chapter]")?.dataset.gChapter
        })),
        overflow: document.documentElement.scrollWidth > innerWidth,
        controls: document.querySelectorAll("button, select, details").length,
        images: [...document.images].map(i => i.getAttribute("src")),
        sources: Object.fromEntries(chapters.map(chapter => [
          chapter,
          [...document.querySelectorAll(chapter === 3
            ? "[data-source-paragraph]"
            : "[data-chapter" + chapter + "-paragraph]")].map(p => p.textContent)
        ])),
        links: [...document.querySelectorAll("a[href]")].map(a => a.href),
        overlaps: [...document.querySelectorAll(".trials article")].filter(a =>
          a.querySelector(".trial-description").getBoundingClientRect().bottom >
          a.querySelector("img").getBoundingClientRect().top
        ).length
      }), evidence.sourceChapters);
      assert.deepEqual(result.duplicateIds, [], "Duplicate HTML IDs");
      assert.equal(result.pairChapters.length, 5, "Missing comparison pair");
      for (const pair of result.pairChapters) assert.equal(pair.f, pair.g, "Mismatched chapter pairing");
      assert.equal(result.overflow, false, "Horizontal overflow at " + width);
      assert.equal(result.controls, 0, "Scroll-first report has hidden controls");
      assert.equal(result.overlaps, 0, "Trial text overlaps illustration at " + width);
      for (const chapter of evidence.sourceChapters) {
        const source = book.chapters[chapter - 1].blocks.flat()
          .filter(b => b.type === "text").map(b => b.text);
        assert.deepEqual(result.sources[chapter], source, "Changed source chapter " + chapter);
      }
      for (const trial of evidence.trials) assert(result.images.includes(trial.file));
      assert.equal(result.images.filter(s => s.startsWith("trials/")).length, evidence.trials.length);
      assert.equal(new Set(result.images.filter(s => s.startsWith("../images/"))).size, evidence.shown.original.length);
      assert.equal(new Set(result.images.filter(s => s.startsWith("farm/"))).size, evidence.shown.farm.length);
      assert(result.images.every(s => !s.includes("chapter-01")));
      for (const href of result.links) {
        const url = new URL(href);
        if (url.protocol === "file:") assert(fs.existsSync(url), "Broken link: " + href);
      }
      await page.screenshot({ path: path.join(screenshotDir, "report-" + width + ".png") });
      if ([1440, 390].includes(width)) {
        await page.locator(".trial-section").screenshot({
          path: path.join(screenshotDir, "homecoming-" + width + ".png")
        });
        await page.locator(".flight-trials").screenshot({
          path: path.join(screenshotDir, "flight-" + width + ".png")
        });
        await page.locator(".morning-trials").screenshot({
          path: path.join(screenshotDir, "morning-" + width + ".png")
        });
        await page.locator(".garden-trials").screenshot({
          path: path.join(screenshotDir, "garden-" + width + ".png")
        });
        await page.locator(".night-trials").screenshot({
          path: path.join(screenshotDir, "night-" + width + ".png")
        });
        await page.locator('[data-g-chapter="34"]').screenshot({
          path: path.join(screenshotDir, "miniature-" + width + ".png")
        });
        await page.locator('[data-f-chapter="34"]').screenshot({
          path: path.join(screenshotDir, "preferred-" + width + ".png")
        });
      }
      console.log(JSON.stringify({
        width, images: result.images.length, trials: evidence.trials.length,
        sourceParagraphs: Object.values(result.sources).flat().length, passed: true
      }));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
