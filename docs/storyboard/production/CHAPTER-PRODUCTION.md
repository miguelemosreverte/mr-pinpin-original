# Chapter production: a durable illustrated continuity pack

This workflow carries a chapter from source to a complete reviewable proposal without relying on chat memory. The chapter bible, plans, images, sidecars and report are the handoff. They form an **illustrated continuity pack**, not a calibrated 3D model or a promise of exact geometry. Coordinates, dimensions and lens notes are explicit artistic constraints that must be checked against each output.

Start from [chapter-template/](chapter-template/) and the project's [camera-first working method](WORKFLOW.md). For the current Elder revision, [revision-04/CONTRACT.md](chapters-02-04/revision-04/CONTRACT.md) and its user brief are authoritative. Academy remains revision02. Earlier contracts describe preserved proposals.

## Durable files

Keep one production folder per chapter: `bible.md`, `shot-plan.json`, `chapter.json`, `REPORT.md`. Keep generated artwork in the chapter's own `images/<chapter>/` folder, with exact-prompt JSON and Markdown beside every PNG. Image paths in `chapter.json` are relative to `docs/storyboard`, never relative to the manifest. Do not alter the official reader or published manifest during proposal work.

The bible owns facts, scale relationships, location layout, axes and prop rules. The shot plan owns each intended action, reaction, transition, cast position and camera. The manifest owns the selected sequence and complete narration in Russian, English and Spanish. The report owns actual progress, failed/rejected versions, review findings and next steps. Each session reads these files before generating more art.

## Hard gates

These are internal production checks. Proceed autonomously when the evidence is sufficient; do not turn each gate into a user permission request. Final proposal review and publication remain separate decisions. Record gate state, evidence path, reviewer and timestamp in the bible/report. An unchecked box is not a pass.

### 1. Source and adaptation map → story may be planned

Read the entire source, relevant preceding/following scenes and existing art. Map each source block to a planned beat. Separate events happening now from memories, imagined events and future promises. Mark every change as original, expanded, new or intentional silence. Identify repeated source passages and adapt each intended occurrence once. Record invented teachers, buildings, activities and family/history facts as proposals, not established canon. Explain omitted blocks and unresolved threads.

**Stop before planning final narration if:** the source is incomplete, chronology is unresolved, or invented material is being presented as source evidence.

### 2. Characters and spaces → references may be rendered

Inspect original and modern identity references. Record each character's face, silhouette, species, age/proportion cues, fur/quills, clothing and distinguishing objects. Give relative size relationships and reference views, not only names. Note uncertainty; a recognizable face does not prove a consistent age or size.

Define the location before the camera: a stable origin, +X/+Y directions, ground height +Z, entrances/exits, paths, water, furniture, standing/seating zones and light direction. Name the conversation/travel axis and both allowed camera sides. For any interior actually used by the story, design its floor layout, openings, furniture, usable character space and exterior-to-interior connection first. Do not invent an interior merely to fill a checklist.

Record object states per beat: who holds an object, its orientation and location, whether a container is empty/full, whether a crown is being made/worn, whether a machine is loading/travelling/parked. Keep source facts and proposed staging separately identifiable.

**Stop before reference generation if:** identities, relative sizes, usable ground, required interior layout or geography remain contradictory.

### 3. Illustrated reference pack → scenes may be rendered

Render the canonical cast study and environment layout/clean plate with the built-in image tool. Include scale references and an interior layout only when required. Inspect every reference at full size, including faces and visible limb attachments. Resolve continuity contradictions now. List the selected, internally reviewed versions in the bible and manifest preproduction pack. Preserve rejected attempts with reasons.

For each reference, record its role: identity, size comparison, environment continuity, camera plate, material/lighting, or prop geometry. A reference containing a character does not authorize that character in every scene. Keep short reference chains; do not repeatedly polish a noisy composite. For a newly integrated character, compare the actual cast study side by side with an established finished chapter image before accepting it. Assign that finished image explicit rendering authority; photographs and older assets may control likeness or markings without controlling materials, eye design or shadow treatment. Check facial style again at final scene size: a good enlarged portrait can still collapse into dark button eyes when the character is small.

A scene may proceed as soon as its own region and required references pass; unrelated pending locations must not hold the whole chapter. Record that scoped acceptance explicitly.

Check physical transitions with fixed-size props and a fixed-camera state comparison: a roof must not grow to solve a support gap. A shared cast lineup is the working scale authority when isolated portraits differ. For connected interiors, verify door hinges/swing, clear landings, both travel directions, fixed light sources and wall orientation in reverse views. Concept art is not a measured floorplan; record remaining uncertainty honestly.

For concealed natural routes, establish the same opening from both sides, actual crouching/body clearance for every traveler, the modest amount of loose material moved, rug/furniture states, recognizable bends and slopes, and the light source at each stage. A return sequence must retrace those landmarks. If the story replaces built stairs with a root fissure, audit retained backgrounds as well as the new travel shots; old doors or stair mouths cannot silently remain. A sleeping mentor's later appearance needs a plausible waking/following beat or explanation.

**Hard scene-generation gate:** source map, character/size bible, location/interior layout, camera axes and prop-state rules exist; cast and environment references have been generated and visually inspected; selected reference paths and actual review findings are recorded. An intent-only prompt is not an inspected reference.

### 4. Coverage and camera plan → each shot may be attempted

Plan the complete sequence before filling isolated attractive images. Each meaningful action needs a readable setup, consequence or response; connect location/time changes with sufficient physical or emotional transitions. Silence can carry a reaction. Avoid filler and arbitrary image quotas.

For every shot record source evidence, purpose, action/reaction/transition role, cast positions, look directions, camera position and target, eye height, framing, axis side, foreground/middle/background, light, prop state before/after and selected reference IDs. Coordinates are scene-space art direction, not measured rendering output. Describe off-camera partners for reverse shots so eyelines remain consistent. Mark inherited art as reuse only after checking it against the new sequence.

**Stop that shot if:** the action is unclear, no valid references exist, the camera crosses the axis accidentally, an object changes state without a beat, or the narration describes something the image cannot show.

### 5. Image and narration QA → a scene may enter the manifest

Generate one standalone image per shot using the built-in image tool, not a montage. Store the exact prompt before the call. Record UTC start/end, output path, dimensions, SHA-256 and references immediately afterward; distinguish observed request wall time from model-only time. Retain failures without inventing timestamps and version corrections without overwriting approved images.

Inspect the saved full image. Check identity, visible fore/hind attachments, relative size, gaze, camera/axis, geography, props, exposure and botanical/material continuity. Inspect small faces enlarged. Distinguish mutual conversation gaze from shared attention to an object, and judge actual pupils and face direction. When a baby is carried, verify support and count the adult’s arms; a greeting need not add a waving hand. Whole-class or whole-family views must preserve the established cast count, while close views may leave explicitly placed partners off camera. Hidden limbs, unseen anchors and concealed joints remain unverified. Record what actually appears, including caveats. For defects, make a targeted versioned correction and inspect again. Keep any rejected image outside the selected manifest.

Write narration that matches the selected image and source/adaptation map. Preserve whole thoughts while splitting dense exchanges across action and reaction beats. Complete RU/EN/ES text and descriptive alt text for every selected scene. An empty narration array is permitted only for intentional silence, which must be marked `source.kind: "silent"`.

### 6. Whole-chapter review → a proposal may be presented

Review the entire chapter in order: pacing, cause/effect, entrances/exits, day/time, emotional transitions, scale, changing prop states and unresolved future threads. Inspect the preproduction pack alongside the resulting scenes. Compare revised Elder scenes with optional `before` images where useful. Review all three languages, including repeated source passages and adaptation additions.

Run `node scripts/verify-chapter-workshop.cjs` from the durable workspace (add `--revision 2` for the current revised proposal). During generation, `--allow-pending` reports missing assets as pending; it is **not** a completion pass. Open `review/chapter-workshop.html` on the local server; check desktop and a 390px mobile viewport. All scene images must remain uncropped, the complete reading sequence must be reachable, and production-only commentary must stay outside reading mode.

**Completion gate:** no missing selected assets, complete three-language narration, structural/hash checks pass, every output has an actual review, no unresolved blocking continuity defect, and full-sequence desktop/mobile review is recorded. Present status as proposed until Miguel approves. Publication requires a separate authorized cutover; this workflow does not publish anything.

## Recovering the work in a new session

Read the contract, bible, shot plan and report. Verify selected files against their sidecars. Resume at the first unmet gate or incomplete shot; do not reconstruct decisions from chat or rerender accepted images because their history is unfamiliar. Update `REPORT.md` after each phase with finished work, actual caveats, remaining files and the next concrete action.

Legacy artwork may reside only in sibling `mr-pinpin-original/docs/storyboard` in a sparse checkout. The existing local preview server resolves `/storyboard/<path>` from the durable worktree first, then the original checkout. Workshop image URLs stay relative to that unified storyboard root. The verifier is stricter: its filesystem fallback is restricted to explicitly reused images and optional before comparisons, and every fallback is reported. New renders and declared new references must exist in the durable worktree. Never substitute unrelated legacy artwork or invent provenance for an old file.
