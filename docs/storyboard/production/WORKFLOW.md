# A Camera-First Illustrated Chapter

Working method, 15 September 2026. This is an evolving practice, not a guarantee of one-shot correctness. Chapter 1 included substantial direction and correction from Miguel. Chapter 2 tests whether those lessons transfer without asking him to direct each camera move.

## What Chapter 1 Taught Us, in Sequence

1. Compare the original book and existing style trials before choosing a rendering direction. Miguel preferred the warm dimensional woodland and miniature treatments, with believable animal scale.
2. Separate location photography from character placement. The first approach image resembled a lake replaced by a road. Moving the camera onto the actual bank, with the lake below on the left and the path ahead on the right, solved the compositional misunderstanding. See `chapter-01-path-camera-02.json` for the recorded prompt and visual checks.
3. Explore physical travel, not just crops: walk the camera 50 metres back, then again; descend below water and look up at approximately 40 degrees, then almost 90 degrees; resurface with droplets on the lens. Those views created a journey and changed what the reader could discover.
4. Test character blocking separately. Colored limbs made anatomy easier to discuss, but simplified faces and poses sometimes survived the finishing pass. Removing limbs also changed surrounding bodies and posture. That experiment did not establish reliable control.
5. Prefer a direct character render from a clean environment plate and a shared character reference. Place the whole scene's cast together, using simple positive instructions for position, size, posture and gaze. `chapter-01-direct.json` records 11 calls for 10 character scenes, including a discarded opening. It was not literally a perfect one-shot run.
6. Inspect outputs, not intentions. Walk-away direction and hedgehog scale needed correction. Later, two rabbit illustrations still had duplicated forelimbs. `chapter-01-rabbit-anatomy.json` records targeted corrections. Check two forelimb attachments and two hindlimb attachments, including partially hidden ones, rather than merely counting visible paw tips.
7. Sequence the book around actions. Put narration next to the image it describes; use complete short sentences or intentional silence. Keep the empty resurfaced lake and wet Mr. PinPin greeting on separate pages so the reveal requires a page turn.
8. Design the reading surface independently. Mobile works best here with full-width uncropped illustrations, normal vertical scrolling and native pinch/pan. The experimental swipe reader squeezed images and conflicted with zoom. Preserve the prose. Compose print pages deliberately; do not make the website a stack of rasterized PDF pages.
9. Publish small reversible commits, verify the live images, and open the browser with the operating system's `open` command.

Repeated edits appeared to brighten highlights. The cause has not been established; watermark accumulation is not a verified explanation. Keep pristine plates and short reference chains, and compare exposure visually.

## Repeatable Pass

1. Read the entire source chapter. Separate events actually happening now from promises, memories and imagined future scenes. Record source evidence and any staging inventions.
2. Write a small shot plan: source beat, camera location and height, physical movement, viewing direction, field of view, foreground/middle/background, light, and empty space for later actors. Lens values and distances guide the generator; they do not produce calibrated geometry.
3. Inspect reference images. Give each reference one clear role: environment continuity, style, or character identity. A reference containing an animal is not permission to add one to a landscape-only pass.
4. Generate one candidate per shot using the built-in image tool. Use concise, positive camera direction and explicit landscape-only scope. Branch from shared location references rather than repeatedly polishing the previous edit. Log retries as new shots/versions, never erase failed attempts.
5. Register the result immediately. The journal copies the PNG and writes same-basename JSON and Markdown, with exact prompt, references, UTC start/end, tool-call duration, dimensions, SHA-256, source output and saved location. The report rebuilds after every registration.
6. Inspect the full image before using it as a reference. Record what succeeded and what did not. Review geography, scale, viewpoint, usable ground, unwanted fauna, exposure and botanical continuity. A visual judgment is not an automated proof.
7. Present the landscape sequence for review. After the environment direction is accepted, add each scene's entire cast in one direct pass from its clean plate. Check facial quality and fore/hind anatomy before accepting a frame. Do not reinstate the colored-leg pipeline by default.
8. Only then adapt the narration, translate, compose print pages, test desktop/mobile/PDF, and publish a finished chapter. A camera study stays labeled as a study and never silently becomes a completed chapter.

## Lightweight Journal

`scripts/image-journal.cjs` does not call an image API. Codex uses the built-in image-generation tool; this helper automates copying and documentation once that tool returns. No API key or additional orchestration service is involved.

The exact prompt is stored in the plan before generation. Record UTC time immediately before and after the image call. Then run, from the repository root:

```sh
node scripts/image-journal.cjs capture docs/storyboard/production/chapter-02-landscapes.json shot-01 /absolute/generated.png START_ISO_UTC END_ISO_UTC
node scripts/image-journal.cjs review docs/storyboard/production/chapter-02-landscapes.json shot-01 'What the image actually shows; remaining caveats.'
node scripts/image-journal.cjs build docs/storyboard/production/chapter-02-landscapes.json
```

Image `shot-01.png` has adjacent `shot-01.md` and `shot-01.json`. Capture refuses to overwrite existing records. The JSON record is the machine-readable snapshot; the Markdown is human-readable. Update review notes through the helper so both stay synchronized. Prompts are snapshots of the actual tool input, not retrospective summaries.

The HTML orders records by actual generation start time, while preserving each shot's reading position. Summed call durations are not total project duration, model-only computation, monetary cost or parallel throughput. Earlier Chapter 1 logs have wall times but not universally complete timestamps; we do not invent missing history.
