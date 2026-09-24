# Tractor tour UI — implementation status

Separate tractor-tour.html/css/js/config.js and tractor-tour-gestures.js preserve accepted earlier demos. The24-frame manifest is merged with an explicit available-panorama map; extracted frames alone never become ready panoramas. Every entry resets the descriptor yaw/pitch/verticalFOV. The stage retains16:9 across widths. Evidence rows expose raw frame, restoration and available panorama/prompt links.

The entering right-drag/two-touch gesture is ignored through release. Wheel input while moving is discarded, followed by120–160ms quiet before new head-look input. A new gesture after arrival changes yaw/pitch. Left drag or slider cancels the transition. The nearest available stop uses shortest cyclic video time; no metric15° spacing is claimed.

Syntax checks passed for app and gesture helper. Direct-mini Chrome smoke launch stalled before producing assertions; it was stopped. No new browser pass or visual alignment acceptance is claimed here. Parent subsequently enabled the fitted stop04 pilot as an explicitly labeled alignment draft and owns that configuration update. Updated user feedback halted generation; exact original-frame preservation is now the priority. Original-frame projection is proposed, not implemented by this lane yet.
