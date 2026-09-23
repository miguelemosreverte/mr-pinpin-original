# Recorded illustration workflow example

This example executed `render → prepare → built-in image_gen → import → validate` using `../common-room.json`, then repeated the same path with feedback in `visibility-revision.json`. Both image-generation prompts came verbatim from their prepared jobs; the shared location template and renderer remained unchanged.

**Selected workflow illustration:** `revision-result/generated-original.png`, with `revision-prepared/prompt.txt` and `revision-review.json`. The revision removes the invented right-edge counter by changing only the job's intent/action parameters. Its corresponding geometry was rerendered through the same CLI. The first result is retained below as iteration evidence.

- `prepared/geometry-reference.png`: actual current-house Blender view.
- `prepared/prompt.txt`: fully expanded stable template and shot parameters.
- `prepared/imagegen-job.json`: exact tool arguments and reference identities at generation time.
- `generation-record.json`: tool execution record and visual observations.
- `result/generated-original.png`: unmodified generated output.
- `result/provenance.json` and `result/generated-manifest.json`: imported result identity and source provenance.
- `review.json`: visual review; separate from file-integrity validation.

The first result is a workflow demonstration, not an approved chapter image. Its main table, stove, bookcase and closed door broadly follow the guide, but it adds a visible counter at the right edge absent from the gray view. The selected revision corrects that finding. Decorative details and artistic proportions remain illustrative; a successful checksum validation does not certify exact architectural fidelity or imply chapter approval.

Absolute paths in the recorded tool invocation describe this execution. At another checkout, run `prepare` again to resolve local paths; do not blindly reuse those archived absolute paths. Restore example media with the scoped `assets/locations.json` manifest as described in the location README.
