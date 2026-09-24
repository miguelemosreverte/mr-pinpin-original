# Tractor: orbit and look around

Preview: `/tractor-explore.html`. This experiment preserves `/tractor-orbit.html` and the accepted story-world panorama.

The orbit video changes the observer's position around the tractor. The panorama changes the viewing direction at one available position. They are separate capabilities: turning within one panorama does not create additional positions around the vehicle.

## Interaction contract

- Left-button / one-finger dragging scrubs the looping orbit.
- Two-finger trackpad scrolling, right-button dragging, or two-touch movement requests look-around. A visible button offers the same entry.
- First, travel smoothly along the shortest cyclic video path to the available panorama stop. Coalesce look input during travel and apply it after arrival.
- At that stop, look freely in yaw and pitch. Ordinary orbit dragging can interrupt the transition and return to the orbit.
- Keep gesture handling inside the scene; do not consume surrounding page scrolling. Trackpad scrolling and mouse-wheel events share a browser interface.

## One existing stop

`anchor.json` identifies the reused tractor panorama, its three repairs, and approximate video time-zero anchor. The panorama and video have different illustrated camera placements; a composition change on switching remains possible. Smooth travel to the stop does not guarantee an exact visual match.

No new video was requested. Four deterministic video-frame extracts were prepared before scope was reduced; they are not four panorama stops. One already-submitted near-side panorama draft is retained as unused, with its prompt and generation record. See `EXTRACTIONS.md` and `VISUAL-REVIEW.md`.

Future equally spaced stops would require 24 views for 15° spacing, six for 60°, or nine for 40°. The video's angular speed varies, so future stop times must be visually registered rather than inferred from a constant degrees-per-second assumption.

## Storage and verification

Original selected assets remain in the story-worlds and tractor-orbit packs and their existing archive manifests. New experiment media lives on the mini's TB4 SSD under `shared/pinpin-tractor-explore-20260924/`. The local browser mirror uses `http://127.0.0.1:18791/`, tunneled to the mini; it does not depend on the Air's SMB mount.

See `BROWSER-REVIEW.md` for interaction verification. This is a local review experiment, not a public-site deployment.
