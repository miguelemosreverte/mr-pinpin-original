# Independent expanded-room QA

2026-09-22, canonical source on8789. Own source file: scripts/verify-expanded-home.cjs. No runtime, artwork, other verifiers or Git changes by this lane.

Architecture: visually inspected selected room-expanded-v2.webp. Exactly two round eight-spoke windows flank the green doorway, with clear circular center panes. The bread counter is on the left; stove and added bookcase coexist on the right. Ceiling rafters/lantern and additional foreground floor create useful vertical content. Inspected initial portrait/desktop and top/bottom pan-bound screenshots; the scene remains coherent and readable.

Actual Chrome checks passed4/4 viewports:390×844 RU touch,320×568 EN touch,844×390 ES touch,1440×900 EN mouse. Native CDP touch events were used for mobile drag/pinch.

All32 starting/minimum-zoom directional cases passed: left/right/up/down each move immediately from a fresh initial view and from the minimum zoom, without first zooming in. The smallest available tested move at minimum was22.72 CSS pixels on320×568;390×844 and844×390 allowed at least33.76 pixels. Initial zoom is1.25×cover; minimum1.08×cover and maximum3×cover clamp correctly.

At maximum zoom, all four pan boundaries remain fully covered with no page overflow. Projected path checks compare48 source-boundary samples per object with1201 samples of the actual warped path. Worst observed nearest-sample distance was1.84 screen pixels at desktop maximum zoom; mobile was1.10 pixels or less. This includes sampling error. Both native links remain aligned with projected artwork after dragging. A drag starting on each hotspot does not navigate; the next ordinary tap/click opens the intended language-specific atlas or library URL. Keyboard Tab reveals cropped targets. Rotation preserves coverage and contour alignment. Flags remain fixed, browser viewport scale stays1×, and no page errors were recorded.

Evidence: results.json plus initial/max-edge/rotated PNGs. B owns the separately updated existing camera/depth/focus/fallback verifiers; this report does not duplicate PDF/library checks. Source syntax and git diff --check pass. Files settled for parent integration.
