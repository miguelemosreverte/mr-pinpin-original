# Tractor exploration review

## Scope and retained draft

The selected experience uses the **one existing tractor panorama**. Orbit playback snaps to its available stop before look-around begins. Different yaw/pitch directions within that sphere are not additional translated positions. The prior four-stop proposal was stopped after the user clarified the intended scope.

Exactly **one new image call** had already completed in this lane: `near/panorama-v1.png` (1774×887; SHA-256 `691a24dc8221f09331478b7e5068ca7baeaaee8ce7ab59edd3e912bdc94fe961`). It is retained on mini/TB4 as an **unused draft**, with literal `near/prompt.txt` and `near/generation.json`. The built-in tool returned PNG bytes in a data URL, with no filesystem output hint; those bytes were decoded unchanged and saved via SSH because the Air SMB mount was stalled. No far-side image or repair was generated. The far prompt was prepared but never submitted.

Flat inspection of the unused draft shows a centered side-on tractor and tandem trailer, but it has not undergone full spherical QA and is not integrated. It is not evidence that additional look-around stops are available.

## Existing panorama anchor

The existing sphere places the tractor left of its longitude center. A tractor-facing view therefore requires a negative yaw (roughly −105°), not yaw0. Its illustrated viewpoint and scale are similar to the video’s starting front three-quarter image, but their camera positions were not recovered from shared 3D geometry. An orbit-to-panorama transition can match composition approximately; it must not imply exact positional registration.

The selected configuration is yaw −105°, pitch −5°, vertical FOV75°. This is a reasonable source-image-based tractor-facing starting view: it turns toward the left-hand vehicle and looks slightly below the horizon. It is a composition recommendation, not a confirmed match to the video camera. My local Chrome launch stalled before page readiness and was stopped; no application defect is inferred from that environment failure. Actual rendered framing and interaction checks belong to the UI agent’s browser evidence. No additional art or runtime change was requested.

The previously accepted panorama and orbit media remain unchanged.
