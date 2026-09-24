# Image-led tour UI review

Route: `/house-image-tour.html`. This is a separate local experiment; the official home, prior tour, shared renderers and historical textures are unchanged.

The common room uses historical A's original base and front/up/down repairs with only its new rear image. Private rooms use their selected panoramas plus separately sampled perspective repairs. The existing spherical renderer samples repair textures independently at full source resolution. No new Blender model or measured-layout claim was introduced.

Door contours were traced from the actual selected images. There are four directed routes: common→bath, bath→common, common→bedroom and bedroom→common. Private-room arrivals face the bath/bed; returns face into the common room. The URL records room/camera, and browser Back/Forward restores each node. Room selection is also available for review. Offscreen/behind-camera doors cannot intercept pointer clicks; keyboard Tab turns toward them.

## Functional verification

Desktop1500×1050 and mobile390×844 passed actual room images, all four directed transitions, native mouse/CDP touch taps, drag starting on a door without navigation, keyboard focus/reveal/Enter, browser Back/Forward, mobile pinch, Reset and viewport bounds. No JavaScript errors occurred. Main evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-house-image-tour-20260924/browser-check/results.json`, with room arrival/return captures.

## Visual review — initial private panoramas

The common rear replacement blends coherently in the reviewed center, side boundaries and rear-floor view without an obvious leftover table or doubled furniture. The stove/bookcase and preferred original front remain intact. The two interactive contours follow the actual doorway openings.

The first bathroom/bedroom panoramas retain a hard rear wrap and floor texture convergence. Both ceilings are broadly coherent at89°; the bathroom door leaf is not reciprocal to its common-room side. Those are artwork issues, separate from working navigation. See the independent REVIEW.md and any later selected revisions before treating this as visually final. The original generated panoramas and extracted repair inputs retain this first state; the final/ capture folder records selected repaired views.

The viewer gives fixed-point rotation and node transitions, not free movement in a metric 3D house. Nothing was published or committed by this UI lane.

## Five-repair integration

Bath front/rear/down and bedroom rear/down are active. Bath front uses frontMask [0,0,2,2] so the generic patch feather applies without A’s knob-only mask. The bath return contour was retraced against its new right-hand leaf and aperture. Both floors and rear joins improve substantially. Initial integration left a faint old left-leaf tip in the upper front feather; the final selection below resolves this issue.

The four directed transitions passed again after repair integration. Mobile common-room framing starts on the bathroom door so a usable target is visible, while desktop shows both doors. Fullscreen entry/API exit and WebGL loss/restoration passed. The room-specific compact repair gallery loads all before/after pairs and exact prompts on mobile without overflow; evidence recovery.json and gallery.json.


## Final selected bathroom cleanup

The selected bathroom base is `panorama-door-v2.png` (3072×1536), while front/rear remain separate live repair textures and down now selects `down-v3.png`. The wider registered base removes the old upper-left leaf remnant. The intermediate `down-door-v2.png` registration still left a floor fragment beyond its angular support; the final targeted generated `down-v3.png` removes that stump. The evidence gallery therefore shows the actual cleanup input `down-door-v2.png`, selected output `down-v3.png`, and exact `down-prompt-v3.txt`.

Final actual-renderer lower-front, nadir and rear captures show no remaining old-left leaf in the inspected regions. The right-hand door, floorboards, woven mat and tub remain coherent. The common-room return link still works. Focused checks also confirm the cleanup gallery points to the actual input/prompt and all selected links load. Evidence: `browser-check/final/selected-final.json`, `bath-lower-selected.png`, `bath-down-selected.png`, `bath-rear-selected.png`; prior upper-front captures show the resolved tip.

The complete four-route desktop/mobile suite passed before this texture-only cleanup; the final focused bath→common check passed afterward. Shared renderer and controls are unchanged. The independent art review retains minor inherited common-room floor tone/texture residuals and the image-led geometry limitations. The new tour is ready for local user review, without claiming a flawless measured house.
