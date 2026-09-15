const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const normalize = text => text.replace(/\bD\s+eep\b/g, "Deep").replace(/\bE\s+n lo\b/g, "En lo").replace(/\s+/gu, " ").trim();

async function main() {
  const base = process.env.READER_URL || "http://127.0.0.1:8767/storyboard/";
  const art = JSON.parse(fs.readFileSync(path.join(__dirname, "illustrations.json")));
  const translations = JSON.parse(fs.readFileSync(path.join(__dirname, "translations.json")));
  const book = JSON.parse(fs.readFileSync(path.join(__dirname, "book.json")));
  const copyEdit = JSON.parse(fs.readFileSync(path.join(__dirname, "production/chapter-01-copy-edit.json")));
  assert.equal(createHash("sha256").update(fs.readFileSync(path.join(__dirname, "book.json"))).digest("hex"), copyEdit.originalBookSha256);
  const assets = art.chapters["chapter-01"];
  const imagePages = [1,2,3,3,4,4,5,5,6,6,7,7,8,9,10];
  const scenesFor = lang => lang === "ru" ? art.scenes["chapter-01"] : translations["chapter-01"][lang].scenes;
  const expected = lang => (lang === "ru" ? art.scenes["chapter-01"] : translations["chapter-01"][lang].scenes).flatMap(s => s.paragraphs);
  const waterBegins = {
    en:"Soon, water began to rise from the center of the circle.",
    es:"Pronto empezó a brotar agua del centro del círculo.",
    ru:"Вскоре из центра круга начала подниматься вода."
  };
  for (const lang of ["en", "es", "ru"]) assert.equal(scenesFor(lang)[6].paragraphs[0], waterBegins[lang], "First water narration is mistimed");
  const source = book.chapters[0].blocks.flat().filter(b => b.type === "text" && b.text !== "---").map(b => b.text);
  const restored = JSON.parse(JSON.stringify(scenesFor("ru")));
  for (const change of copyEdit.changes) {
    assert.deepEqual(scenesFor(change.language)[change.scene - 1].paragraphs, change.after);
    if (change.language === "ru") restored[change.scene - 1].paragraphs = change.before;
  }
  assert.equal(normalize(source.join(" ")), normalize(restored.flatMap(s => s.paragraphs).join(" ")));
  for (const lang of ["en","es","ru"]) for (const paragraph of expected(lang)) assert(!paragraph.trim().endsWith(","), "Dangling sentence fragment");
  assert.equal(assets.length, 15);
  const output = process.env.EXPORT_DIR || path.join(os.tmpdir(), "pinpin-chapter-one-margin-preview");
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of process.env.LIVE_CHECK ? [1440, 390] : [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      for (const lang of ["en", "es", "ru"]) {
        await page.goto(base + "?chapter=1&lang=" + lang);
        await page.waitForSelector("#reader[aria-busy=false] article");
        await page.evaluate(() => window.prepareChapterPrint());
        assert.equal(await page.locator(".scene").count(), 15);
        assert.equal(await page.locator(".spread").count(), 10);
        assert.deepEqual(await page.locator(".spread").evaluateAll(sheets => sheets.map(s => s.querySelectorAll(".scene").length)), [1,1,2,2,2,2,2,1,1,1]);
        assert.equal(await page.locator('#scene-14 .prose').count(), 0, 'The lake pause must be silent');
        assert(!/PomPom|ПомПом/.test(await page.locator('article').textContent()), 'Wrong character in chapter one');
        assert.equal(await page.locator(".scene-art img").count(), 15);
        assert.equal(await page.locator("#chapter-list,.chapter-navigation,.original-art,dialog,details").count(), 0);
        assert.equal(await page.locator("html").getAttribute("lang"), lang);
        assert.deepEqual(await page.locator(".prose > p").allTextContents(), expected(lang));
        assert.equal(await page.locator(".page-number").last().textContent(), "10");
        assert.deepEqual(await page.locator(".scene").evaluateAll(nodes => nodes.map(scene =>
          [...scene.querySelectorAll(".prose > p")].map(p => p.textContent))), scenesFor(lang).map(s => s.paragraphs));
        assert(await page.locator(".scene").evaluateAll(nodes => nodes.every((scene, index) => {
          const image = scene.querySelector("img").getBoundingClientRect();
          const prose = scene.querySelector(".prose")?.getBoundingClientRect();
          const next = nodes[index + 1]?.getBoundingClientRect();
          return (!prose || prose.top >= image.bottom - 1) && (innerWidth <= 600 || !next || next.top >= scene.getBoundingClientRect().bottom - 1);
        })), "Image, matching text, next image must read strictly top to bottom");
        assert(await page.evaluate(expected => [...document.querySelectorAll(".scene-art img")].every((i, n) =>
          i.getAttribute("src") === expected[n].src && i.naturalWidth === expected[n].width && i.naturalHeight === expected[n].height
        ), assets));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert(await page.evaluate(() => {
          const rail = document.querySelector(".toolbar").getBoundingClientRect();
          return document.querySelector("main").getBoundingClientRect().right <= rail.left;
        }), "Margin controls overlap the reading column");
        assert.equal(await page.evaluate(() => {
          const rectangles = [...document.querySelector(".toolbar").children].map(n => n.getBoundingClientRect());
          return rectangles.some((a, i) => rectangles.slice(i + 1).some(b =>
            Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)));
        }), false, "Toolbar collision");
        assert.equal(await page.locator("#print svg").count(), 1);
        assert(await page.locator('.language-selector button').evaluateAll(buttons => buttons.every(button => {
          const style = getComputedStyle(button);
          return style.backgroundRepeat === 'no-repeat' && style.backgroundOrigin === 'border-box' && style.backgroundSize === 'auto 112%';
        })), 'Flag backgrounds must not repeat around the circular crop');
        if (lang === "en") {
          await page.screenshot({ path: path.join(output, "opening-" + width + ".png") });
          await page.locator("#scene-15").scrollIntoViewIfNeeded();
          await page.waitForTimeout(100);
          await page.screenshot({ path: path.join(output, "ending-" + width + ".png") });
        }
        if (width === 1440 && !process.env.LIVE_CHECK) {
          const pdf = path.join(output, "Mr-PinPin-Chapter-1-" + lang + ".pdf");
          await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
          const info = execFileSync("pdfinfo", [pdf], { encoding: "utf8" });
          assert.match(info, /Pages:\s+10\b/, "Expected ten sequential PDF pages");
          const pageInfo = execFileSync("pdfinfo", ["-f", "1", "-l", "10", pdf], { encoding: "utf8" });
          const sizes = [...pageInfo.matchAll(/Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+)/g)];
          assert.equal(sizes.length, 10);
          sizes.forEach((size, index) => assert.equal(Number(size[2]) > Number(size[3]), [7,8,9].includes(index), "Wrong paper orientation"));
          const imageRows = execFileSync("pdfimages", ["-list", pdf], { encoding: "utf8" })
            .split("\n").filter(line => /^\s*\d+\s+\d+\s+image\s/.test(line));
          assert.equal(imageRows.length, 15, "Missing PDF illustrations");
          imageRows.forEach((row, index) => {
            const fields = row.trim().split(/\s+/);
            assert.equal(Number(fields[0]), imagePages[index]);
            assert.deepEqual(fields.slice(3, 5), ["1536", "1024"], "PDF image resolution changed");
          });
          const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
          const pages = text.split("\f").filter(s => s.trim());
          assert.equal(pages.length, 10);
          for (let index = 0; index < 10; index++) {
            assert(pages[index].includes(String(index + 1).padStart(2, "0")), "Wrong page sequence");
          }
          const pdfText = normalize(text.replace(/-\s*\n\s*/g, "-"));
          for (const paragraph of expected(lang)) assert(pdfText.includes(normalize(paragraph)), "Missing PDF text");
          scenesFor(lang).forEach((scene, index) => {
            const samePage = normalize(pages[imagePages[index] - 1].replace(/-\s*\n\s*/g, "-"));
            scene.paragraphs.forEach(paragraph => assert(samePage.includes(normalize(paragraph)),
              "Narration separated from illustration " + (index + 1)));
          });
          assert(!text.includes("Print / Save PDF"), "Controls leaked into PDF");
          console.log(JSON.stringify({ pdf, pages: 10, illustrations:15, text: "complete and on matching pages" }));
        }
      }
      await page.evaluate(() => {
        if (innerWidth <= 600) document.getElementById('reader').scrollLeft = document.getElementById('reader').clientWidth * 6;
        else scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.45);
      });
      await page.waitForTimeout(150);
      const fraction = () => innerWidth <= 600 ? document.getElementById('reader').scrollLeft / (document.getElementById('reader').scrollWidth - document.getElementById('reader').clientWidth) : scrollY / (document.documentElement.scrollHeight - innerHeight);
      const before = await page.evaluate(fraction);
      const flag = await page.locator('[data-lang="en"]').boundingBox();
      await page.mouse.click(flag.x + flag.width / 2, flag.y + flag.height / 2);
      await page.waitForFunction(() => document.documentElement.lang === "en");
      await page.waitForTimeout(100);
      const after = await page.evaluate(fraction);
      assert(Math.abs(before - after) < 0.04, "Language switch lost position");
      await page.evaluate(() => history.back());
      await page.waitForFunction(() => document.documentElement.lang === "ru");
      await page.evaluate(() => { window.print = () => { window.printCalled = true; }; });
      await page.locator("#print").click();
      await page.waitForFunction(() => window.printCalled);
      assert.equal(await page.locator(".toolbar button:disabled").count(), 0);
      assert.equal(await page.locator("#export-status").textContent(), "");
      await page.evaluate(() => {
        window.printCalled = false;
        document.querySelector(".scene-art img").src = "data:image/png;base64,eA==";
      });
      await page.locator("#print").click();
      await page.waitForFunction(() => document.getElementById("export-status").textContent.includes("PDF"));
      assert.equal(await page.evaluate(() => window.printCalled), false, "Printed with a failed illustration");
      assert.equal(await page.locator(".toolbar button:disabled").count(), 0, "Print error left controls disabled");
      await page.goto(base + "?chapter=38&lang=invalid");
      await page.waitForSelector("#reader[aria-busy=false] article");
      assert.equal(new URL(page.url()).searchParams.get("chapter"), "1");
      assert.equal(new URL(page.url()).searchParams.get("lang"), "ru");
      assert.equal(await page.locator(".scene").count(), 15);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, languages: 3, scenes: 15, routing: true, printButton: true, passed: true }));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
