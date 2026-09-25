# Stop 01 source-lock perimeter review

Status: experimental. Parent inspected the nine-view contact and agreed this is substantially better than the previous stop04 trial; actual browser review is still a separate step.

Input background is panorama-assembled-v1.png, source is browser-decoded source-display.png. Canonical camera: yaw −0.0008749585197905297 rad, pitch −0.003432159540798191 rad, vertical FOV65.30246597672627°. source_anchor.py applies its existing .94 rectangular smoothstep feather; no new art edit was made.

Evidence: anchor-review-v1/contact.jpg and its individual900px views. Inspected front; yaw±30° and±60°; pitch−40°/35°; yaw±40° with pitch−35°, all80° FOV. No severe straight rectangular scenery cut or doubled tractor was apparent in these samples. The lower transition retains a visible sharpness difference between softer video foliage and sharper generated foliage; a narrow bent ground texture transition remains at the left. These observations do not establish an invisible boundary everywhere or continuous camera translation.

The separate source-locked4096×2048 sphere has SHA25616b46782eb7dc6fa6e5db7a7a41a16811f4e5a54cdb741d3fbc2d7d197275c72. Cube exports sample that sphere. Runtime must use the unanchored background plus the source overlay, rather than overlaying the source twice.
