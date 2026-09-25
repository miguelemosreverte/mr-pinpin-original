# Strict source-frame browser QA: all 24 stops

PASS. Real headless Chrome on the mini, desktop 1440x1000 and mobile 390x844 using native CDP touch. All 24 stops remain enabled.

All 24 selected runtime cameras match the canonical source camera. Decoded requestVideoFrameCallback timestamps match each saved source-display.json mediaTime within 0.00001 seconds after a 300ms idle hold on entry AND a 300ms idle hold after returning to orbit. Maximum decoded error on entry: 0 seconds; after return: 0 seconds. No source images, timestamps or video were changed.

All 24 anchored Cubemap links return HTTP 200. Desktop left drag changes orbit time, right drag enters look mode and changes heading on a new gesture. Mobile one-finger orbit, two-finger look, pinch zoom and matching return all pass. No horizontal overflow, JavaScript page errors, or generated bridge-media requests.

Evidence: results.json, 24 desktop entry screenshots and four mobile screenshots. Test: ../../verify-source-all24-v2.cjs. The output guard preserves nonempty prior runs. V1 and exact-frame-audit.json preserve the initial one-frame failure; this fresh V2 run verifies the fix.

Fix: tractor-tour.js now cancels queued animation seeks, waits for any in-flight seek, commits the exact stop time directly rather than applying the drag pump 1ms deadband, and requires decoded-frame agreement below 0.00001 seconds before entering look mode. tractor-tour.html loads revision tour-source-lock-v6-exact. The existing controls and art remain unchanged. Experimental scenery joins and accepted source blur remain disclosed in stop reviews.
