# Mr. PinPin and the Timber Tractor: Story Notes

## Scope and authorship

This is original standalone children's fiction, separate from the main book's 38 chapters. It is not a translation, recovered chapter, or adaptation of a supplied source passage. The English story began with the approved 18-scene brief and now has 20 scenes after two family insertions before the picnic; Spanish and Russian preserve its actions, dialogue intentions, and delayed joke, with natural local phrasing. The four new family illustrations remain unapproved candidates awaiting user review.

The old farm story supplies the requested friendly rhythm and interest in machinery only. No source text from that story was supplied or consulted for this copy. No dialogue or plot passage is presented as a quotation from it or from the main book.

The commissioned beats are the meeting with a beaver driver, collecting windfallen timber, transport to a small footbridge, noticing and filling the last gap, the first crossing, and a picnic with a hidden-food joke. New connective inventions include following tire tracks, calling PinPin a lookout, counting the biggest log twice, the apparently shorter forest from the passenger seat, describing logs as wooden passengers, and the closing line about an uneaten bridge. The passenger belt, off-frame log preparation before scene 06, and repair-time transition provide practical continuity. These are story inventions, not evidence of events in the main book.

Read and applied `WORKFLOW.md`: sequence around actions, keep prose next to its image, use short complete sentences, reserve silence for the cover, and separate setup from reveal. The approved commission requests copy before the remaining art is finished. Accordingly, alt text describes the intended final frames and has not been verified against every final image.

## Data and localization

Reader contract: `../stories/timber-tractor.json`. All image paths are relative to `docs/storyboard/`. There are exactly 20 scenes, using 22 unique selected assets across three languages. Scene 01 retains the canonical English cover image path; the reader resolves its displayed cover through `cover[language]`. It must not display the English cover in every language merely because `scenes[0].image` names it. Stable scene IDs 19 and 20 are inserted after 14; IDs do not imply the new reading order.

Fixed titles:

- EN: Mr. PinPin and the Timber Tractor
- ES: El señor PinPin y el tractor forestal
- RU: Мистер Пин-Пин и лесной трактор

The cover has no narration in any language. Every other scene has one or two paragraphs, with no single-word-only paragraphs. Beaver / Castor / Бобр is his species used as a friendly form of address, not an invented personal name. Russian uses Пин-Пин; Spanish uses PinPin. Sound-play stays inside complete prose and does not become detached labels on images.

## Print sequence

The contract's `spreads` entries each describe one page, not a facing-page pair. The `paper` field records portrait or landscape orientation. Indices are zero-based and appear exactly once in reading order. Style values identify editorial purpose; they are not a request for new visual themes.

| Page | Scene numbers | JSON indices | Reading sequence |
| --- | --- | --- | --- |
| 1 | 01 | 0 | Cover alone; localized artwork; no narration. |
| 2 | 02, 03 | 1, 2 | Empty tracks above; meeting and empty trailer below. |
| 3 | 04, 05 | 3, 4 | Windfallen tree and off-camera explanation above; fitted passenger seat and departure below. |
| 4 | 06, 07 | 5, 6 | Grapple close-up above; wide loading action below. |
| 5 | 08, 09 | 7, 8 | Secured load above; forest journey below. |
| 6 | 10 | 9 | Cab approach, with room to understand bank and bridge geography. |
| 7 | 11 | 10 | Delivery to the bank; empty trailer confirms unloading. |
| 8 | 12, 13 | 11, 12 | Last gap noticed above; short plank fitted below. |
| 9 | 14 | 13 | First crossing, given a large image. |
| 10 | 19 | 14 | Mama arrives with baby PomPom. |
| 11 | 20 | 15 | Beaver supervises PinPin at the parked tractor's wheel; Mama applauds. |
| 12 | 15 | 16 | Family picnic and quiet parked tractor; selected image is scene-15-v2. |
| 13 | 16, 17 | 17, 18 | Hidden-food crunch above; reverse shot and question below. No twig. |
| 14 | 18 | 19 | Page-turn reveal: his own willow twig, the family and intact bridge; selected image is scene-18-v2. |

For paired pages, compose two horizontal image-and-text rows stacked vertically. Within each row, keep the complete 3:2 image on the left and its own prose on the right. Read the upper action and its text before the lower action. Never put both images into one strip with an unrelated block of collected narration beneath. A useful A4 starting point is 12 mm outer margins, a 6 mm image/text gutter, a 115 x 77 mm image per row, and a roughly 65 mm text column. Keep body type around 13.5-14 pt with comfortable leading, and give each row up to 120 mm of vertical room for translated text. Check actual font metrics in all three languages before accepting the PDF; change spacing or page geometry instead of shrinking prose to captions.

Single-action pages give the uncropped landscape image the full printable width and place its matching text immediately below. The cover retains its portrait ratio. The setup must be page 13 and the reveal page 14: in a normal left-bound duplex book this places them on opposite sides of a leaf, preserving the physical turn. Extra front matter must not shift that parity without a layout review. The mixed page orientations still require a physical print/layout check.

The web experience remains independent of those paper rows: native vertical scroll, pinch and pan; full-width uncropped mobile images; minimal right-margin controls; no swipe reader. These are layout requirements for the reader worker, not changes made by this copy task.

## Continuity for final review

- PinPin remains a naturally small hedgehog without costume or golden ornament; the identity reference is `images/chapter-02-direct/scene-10-v2.png`.
- The driver is a capable beaver with warm chestnut fur, a broad flat tail, small round ears, two small incisors, and a simple blue work vest. Keep natural non-human proportions.
- The approved cover is a thematic illustration. Its loaded trailer does not establish the load state of the opening meeting, where the trailer is empty.
- The tree fell in the wind. Scene 04 is landscape-only, with Beaver speaking off-camera about plans to use the fallen wood. The intact trunk is the origin of the timber, not a claim that cutting has already happened. Scene 06 begins after off-frame preparation into logs; no saw needs to appear, and no standing tree is felled.
- Scene 05 seats and secures PinPin beside Beaver. During loading and unloading he remains inside the cab, away from the crane. Scene 08 is a mechanism-only close-up; the narration can mention Beaver's check without adding an animal to that image.
- Logs accumulate in scenes 06-07, are secured in 08, travel in 09-10, and are all on the bank by 11. The tractor stays on firm ground beside the stream and never crosses the footbridge.
- Scene 12 begins with a brief elapsed-time transition accounting for the main repairs. Beaver invites PinPin over only after that work. PinPin waits clear during the final plank fitting in 13. The plank spans the small approach gap, not the whole stream.
- Beaver checks the completed bridge before PinPin makes the first crossing. No tractor load test or bridge-sized vehicle crossing is implied.
- Scenes 19 and 20 add Mama and baby PomPom before scene 15. Original `docs/images/image55.png` informs Mama's adult/child proportions and warmth, while scene 19 supplies a modern adapted identity for this family sequence. This is not a claim of a fixed canonical Mama design. Scene 20 depicts supervised steering while parked, not actual driving; the still image cannot verify the engine-off state.
- Scene 15 establishes the picnic without exposing Beaver's twig. Scene 16 hides his food below the lower edge; scene 17 stays on PinPin. Neither prose nor alt text names the food before scene 18. Keep the intact bridge readable behind the final reveal.

## Family production history

The aggregate journal retains all 29 earlier successful outputs plus four family outputs, for 33 total. Three failed requests have separate JSON/Markdown records with no invented PNG: scene-08, scene-13 and the first scene-18-v2 request. Two additions precede the picnic; two family picnic replacements supersede scene-15 and scene-18. Together with scene-06, scene-07, scene-09 and scene-11, there are now six superseded candidates, all preserved. Five intermediate environment plates account for the other unselected outputs.

Adjacent visual reviews describe the actual PNGs, including facial readability, Mama/baby continuity, visible limb attachments and occlusion limits. Baby proportions and apparent age vary between arrival, steering and picnic; the requested exact ratios should not be treated as achieved. Automated journal/art checks establish file, prompt, timing, hash and selection integrity, not anatomy or user approval.

Final art, reader rendering, mobile behavior, font fit, and printed page-turn parity require verification by their respective workers. This copy pass does not claim those checks are complete.
