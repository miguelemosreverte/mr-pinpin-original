# House panorama preproduction review

2026-09-22. Research/QA lane only; root owns generated art and B owns the preview renderer. Experimental panorama remains separate from the approved flat/depth room until review.

## Established architecture

Front wall: exactly two round eight-spoke windows flanking the single green arched exterior door. Small center panes are transparent glass. From indoors, the bread/crockery counter is left; the stove/chimney is right. The expanded approved room places the new bookcase beyond the stove on the continuing right-hand wall. Preserve both objects rather than replacing the stove. Door hinges are on the interior right, one knob on its free left edge, outward swing. Honey-colored wood, cream plaster, curved timber rafters, woven red/tan rug, small stout stools, a round table, plants and restrained warm lanterns establish the room identity.

Best references, under canonical source `/Users/miguel_lemos/anastasia-pinpin-repos/mr-pinpin-source/`:
- `docs/storyboard/images/house-menu/room-expanded-v2.webp`: selected expanded menu and immediate visual identity; inspected this turn's preceding expansion review.
- `docs/storyboard/images/published/elder-cycle/papa-arrival-20260922-arrival-10-v3.webp`: exact two-window front wall and door topology.
- `docs/storyboard/images/published/elder-cycle/elder-r6-family-008.webp`: inspected now; stove/right table, counter/left, woven rug and family-scale furniture.
- `docs/storyboard/images/standalone/home-sweet-home/bedtime-02-v2.png`: inspected now; more distant kitchen camera shows both long side cupboards, central table/rug, warm rafters and lantern. Evening lighting is not the new panorama's morning-light reference.
- `docs/storyboard/images/published/elder-cycle/elder-r6-family-001.webp`: exterior facade independently confirms only two front windows and single green door.

## Unseen back/side portions: proposed, not established canon

The inspected chapter images face the front wall. They do not establish a precise rear-wall plan. Continue existing side cupboards, crockery, baskets, firewood and timber/plaster architecture in the unseen quarters. A modest interior passage to the washing/sleeping rooms is plausible because those rooms exist in Home, Sweet Home, but its exact location/shape is a new design decision. Do not invent a second exterior green door, extra front-wall windows, a duplicate stove, or a second bookcase solely to fill the panoramic wrap. Keep rear furniture sparse enough to understand the room after turning around.

Maintain one continuous ceiling structure and floor plane around a single eye position. The chandelier/rug may anchor zenith/nadir composition; avoid repeating them separately in multiple directions. Garden light should enter from the established front facade, with consistent cast-shadow direction throughout the room. The back wall can be warm and softly lit without acquiring an unexplained second sun/window.

## Panorama-specific review conditions

Use a true2:1 equirectangular layout, horizontal0–360° longitude and vertical−90°..+90° latitude. Left/right edges represent the same direction and must join in material, furniture, ceiling beams, floor planks and illumination. The top/bottom are poles, not ordinary rectangular wall bands. A perspective panorama renderer can reveal projection errors hidden in the flat contact sheet, so inspect front/right/back/left/up/down and the seam through the actual preview.

Specify a single eye position appropriate to a small inhabitant. The viewer turns at that eye: this is rotational look-around, not walking through3D geometry. Avoid extreme physically implausible foreground scale or rail/furniture intersections when turning. Small pitch limits near poles may preserve comfort/readability, but yaw should wrap through a complete turn without a hard stop or duplicated jump.

Keep the door and bookcase at known spherical directions, with contours projected by the same camera as the illustration. Hidden/back-facing targets must not remain clickable. Keyboard focus should turn the camera toward its selected target. Existing flag controls remain fixed. The current expanded flat/depth room is the immediate fallback for absent image/GPU, context loss or reduced motion according to the preview contract.

Independent QA will test a full yaw turn and seam, pitch bounds, FOV limits, real touch/mouse gestures, keyboard focus, projected native link navigation, flags, fallback and rotation. Architectural/art quality remains a separate visual judgment; a working shader cannot certify that a generated image is a coherent360° room.
