# Three illustrated story environments

This study extends the image-led house workflow to three new fixed viewpoints: the Elder’s tree-root home, the restored lake from Chapter 1, and the tractor chapter’s stream and footbridge. The user approved the visual direction during review. Existing house versions and the official reader remain unchanged; projection and seam checks are recorded separately below.

Open [the interactive report](../../../story-worlds.html). It presents the selected scene, the actual source illustrations, the successful panorama supplied as a projection reference, exact prompts and generation records. The viewer supports looking in every direction and switching between the illustrated panorama stack and its exported cubemap while keeping the camera direction.

## Two kinds of reference

The successful central-house panorama is supplied as a separate input from the target location’s book illustrations. Its role is spherical format and visual finish. The book images define the new location and its objects. No half-and-half composite is required. The exact ordered input list and hashes are recorded for every generation.

The Elder’s first panorama already used both kinds of input. The outdoor v1 attempts used book illustrations alone; outdoor v2 adds the successful house panorama. The first lake v2 review found no indoor content transferred into the forest, but a rear join and pinched poles remained. Multiple references do not guarantee a seamless projection. Local perspective repairs remain part of the workflow.

## Scene choices

| Scene | Book authority | Inferred continuation |
| --- | --- | --- |
| Elder’s home | Published wide tree-root interior, map/books detail and root entrance | Unseen rear storage and complete overhead/floor surroundings; no formal stair or temple door is invented |
| Restored lake | Chapter 1 lake, willow, reeds, lilies and forest | Woodland behind the dry shore viewpoint |
| Tractor and bridge | Published stream/footbridge and machinery illustrations | Surrounding woodland and ground beyond the photographed story angles |

The selected tractor view shows bridge work in progress, including the unfinished deck visible in its book reference. The tractor remains parked on dry ground beside the pedestrian bridge. Its yellow crane belongs immediately behind the cab and before the trailer. These empty environments omit story characters and are illustrated continuations, not surveyed reconstructions of the book’s geography.

## Reproducible workflow

See [the reusable workflow](../../panorama-workflow/README.md), its prompt templates, and [the projection CLI](../../../../tools/panoramas/README.md). Generate one equirectangular panorama, inspect the actual spherical view, repair demonstrated defects with registered perspective images, then sample the selected stack into six consistent cube faces. The image model never generates the six final faces independently.

Each scene folder retains its unmodified model outputs, exact prompts, input/output hashes and camera metadata for repairs. Projection jobs pin the selected inputs. An export includes the assembled panorama, six 90-degree face PNGs and a 3×2 atlas ordered `[front, right, back; left, up, down]`. The 3072-pixel panorama and 1024-pixel cube faces are sampled exports; they do not imply extra detail beyond the native model outputs.

Heavy media and browser evidence live on TB4 under `pinpin-story-worlds-20260924`; local source paths point there. Text records and source code belong in Git, while originals and derivatives are preserved through the scoped media archive. See [the Elder notes](ELDER.md), [outdoor notes](OUTDOORS.md), [browser review](BROWSER-REVIEW.md), and [exports](EXPORTS.md) for final checks and limitations. Local review is separate from official publication.

## Generation record

Seventeen built-in image calls were used for these three environments: five for the Elder’s home, four for the selected lake v2 stack, four for the selected tractor v2 stack, and four retained outdoor v1 attempts (two bases and two rear repairs). Mathematical projection and cubemap export do not involve further image generation. The two-reference outdoor comparison is therefore documented as a trial with retained history, not a claim of one-call seamless generation.
