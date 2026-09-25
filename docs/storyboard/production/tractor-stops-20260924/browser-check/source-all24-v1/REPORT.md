# Source-frame browser QA: all 24 stops

QUALIFIED: runtime controls and cube availability pass; exact source-frame identity FAILS at11 of24entries. Real headless Chrome on the mini, desktop 1440x1000 and mobile 390x844 with native CDP touch events. Run completed 2026-09-25T00:05:23.511Z.

All 24 stops are enabled. Each selected opening camera matches its canonical source camera and runtime camera. Each entered within the existing50ms decoded-time tolerance, retained a null bridge-video source, exposed the correct anchored Cubemap link returning HTTP 200, and returned to the matching orbit timestamp after turning away. Maximum decoded timestamp error: 0.04166700 seconds; maximum return-time error: 0.00080800 seconds.

Desktop left drag changed orbit time; right drag entered look mode and changed heading on a new gesture. Mobile one-finger drag changed orbit time, two fingers entered look mode and changed heading, pinch changed FOV, and return restored the matching orbit time. No horizontal overflow. No JavaScript page errors or generated bridge-media requests.

Evidence: results.json, 24 stop-NN-entry-desktop.png screenshots and four mobile screenshots. Representative stop18 desktop and mobile-look captures visually inspected for actual rendered content. Existing art/blur and source-boundary limitations remain experimental; this runtime QA does not certify all joins or measured geometry. No UI or art changes.

Reproduction: ../../verify-source-all24-v1.cjs. The output guard refuses to overwrite a nonempty run. Two earlier harness attempts are separately preserved; they exposed only selector/URL variable errors in the test, resolved before the completed tolerance-based run.

## Exact frame audit

The broader runtime tolerance masked a one-frame mismatch. Compare exact-frame-audit.json with each source-display.json: stops stop-06, stop-07, stop-09, stop-10, stop-12, stop-14, stop-15, stop-16, stop-17, stop-18, stop-23 decode the preceding frame, 41.667ms early. Their currentTime lands0.1–0.8ms short of the nominal target. tractor-tour.js pump omits a final seek below1ms, while snapTo accepts decoded error below50ms. The saved source-display timestamps are exact. This requires a final exact seek and stricter decoded-frame acceptance, followed by a fresh browser run. The original results.json preserves the checks and tolerances actually executed; its pass:true does not establish exact frame identity.
