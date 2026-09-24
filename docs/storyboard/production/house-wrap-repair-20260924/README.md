# Repair the panorama's wall wrap

This is a focused follow-up to the [native panorama experiment](../house-native-panorama-20260923/README.md).
The existing room illustration is the appearance authority for this repair.
The ceiling/floor poles and the previously documented room/fixture identity
mistakes are outside this experiment's repair scope.

## Plan

1. Extract an ordinary perspective view facing the original panorama's left/right
   wrapping boundary. Both incompatible sides appear beside each other in the
   center of this view, with surrounding room context.
2. Give that view to the built-in image model in one focused repair call, using
   the [saved reusable prompt](prompt.txt). Ask for coherent continuation, not a
   new room or an object that conceals the line.
3. Project the repaired view back into the original spherical coordinates with
   a bounded feathered mask. Preserve the opposite wall and poles. Keep the
   original panorama and generated repair unchanged as evidence.
4. Save one new combined panorama, then derive the viewer's cubemap using the
   existing deterministic converter. The final viewer does not require separate
   live repair layers.
5. Compare synchronized views of the original and result at the wall join and
   around the repair perimeter. Check that any disappearance of the original
   line has not been replaced by another line, ghosting, or altered room layout.

This moves the difficult boundary into the middle of the model's editing input;
it does not merely rotate the final panorama to hide the existing defect. A
feathered blend is a compositing operation, not proof that mismatched geometry
has been repaired. Visual inspection is required before accepting the candidate.

## Storage

Large input/output masters, calculations, browser profiles and review captures
belong on the mini SSD at
`/Volumes/TB4/mac-mini-storage/shared/pinpin-house-wrap-repair-20260924/`.
The source report records the prompt, camera, mask, hashes and actual outcome.
No changes to the published site or selected connected house tour are implied.
