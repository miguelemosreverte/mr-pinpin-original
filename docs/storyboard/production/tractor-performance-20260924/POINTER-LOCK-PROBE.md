# Native pointer-lock event probe

**Actual pointer lock succeeds on the Air in a fresh headed Chrome profile.**
A trusted click on a toolbar button outside the stage called the stage's real
`requestPointerLock()`. The browser granted it and emitted `pointerlockchange`;
`document.pointerLockElement` was the stage. No capture flag or browser API was
mocked. [Raw evidence](POINTER-LOCK-PROBE.json) includes successful Air and failed
mini runs.

The fixture viewport was 640×480; the stage occupied x=40–360, y=120–320.
Capture began from the external toolbar near x=60, y=30. With capture active:

- Actual CDP mouse movement to x=900, x=1300, and x=-500 delivered trusted
  stage `mousemove` **and** `pointermove` events with `movementX` values
  **800, 400, and -1800**. These coordinates exceed both stage and viewport.
- Client coordinates stayed at the capture position outside the stage. Use
  relative movement while locked; testing the frozen client coordinates
  against stage bounds would incorrectly discard valid movement.
- Wheel input at the toolbar position and outside the viewport targeted the
  locked stage. Both arrived as trusted wheel events. Do not route locked
  wheel input by the original toolbar position.
- Both mouse and pointer movement events represent the same motion; consuming
  both would double rotation.
- CDP `deltaX/deltaY` on a `mouseMoved` command did not supply relative movement;
  coordinate differences produced `movementX/Y`. Use successive actual CDP
  positions when validating this path.

`page.keyboard.press('Escape')` did not invoke Chrome's native pointer-lock
release in this minimal fixture. It had no application Escape handler. This
is not evidence that physical Escape fails: CDP key injection does not prove
browser-UI accelerator behavior. Integration should test its real Escape
handler calling `document.exitPointerLock()` and observe actual lock state and
`pointerlockchange`, rather than substituting an internal capture flag.

The mini rejected the same real request with `WrongDocumentError: The root
document of this element is not valid for pointer lock.` This occurred in
headless/ephemeral, headed/ephemeral, and headed/persistent Chrome, even with a
standalone HTTP fixture, connected stage, focused/visible document, secure
context, trusted click, and active user activation. These mini runs cannot
validate successful capture. The successful Air test used the same Chrome
153 build family and a standalone HTTP fixture; this isolates the failure to
the test environment rather than establishing an application rejection.

No application runtime files or user browser profiles were changed. Existing
Chrome and Playwright installations were used. The Air had 6.9 GiB free before
the short test; its fresh `/tmp/tractor-pointer-lock-air-*` profile was removed
after the browser closed. All probe browsers and temporary HTTP servers were
closed before handing focus to the integration worker. The small runner/raw
records remain on TB4; the Air runner is `/tmp/tractor-pointer-lock-air-probe.cjs`.
