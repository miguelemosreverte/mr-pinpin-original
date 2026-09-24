# Twenty-four tractor viewpoints

Requested on 2026-09-24: expand the one-stop orbit/look experiment to 24 panorama stops. Reuse the existing orbit video. First restore motion-blurred selected frames; then generate each full spherical view using its restored frame and an accepted panorama as references. Preserve the existing demos and original media.

## Deliverable

A separate browser experiment should travel along the shortest video path to the nearest available stop and enter a tractor-facing panorama. Initial yaw, pitch and field of view come from the stop's recorded camera, not the previous head direction. Input that invoked the transition must not pitch the opening view toward the ground. After arrival, fresh input controls head direction.

Twenty-four views at exactly 15° would require measured camera angles. This generated clip does not supply those angles and changes angular speed. Select 24 distributed visual stops and record exact frame numbers/timestamps; nominal spacing is not a measured camera trajectory.

## Production sequence

1. Extract and preserve decoded source frames from the original video, with source/output hashes and a contact sheet.
2. Restore blur using built-in imagegen, preserving the frame's camera, crop, silhouette, machine parts, lighting and art style. This reconstructs plausible detail, not recovered ground truth.
3. Project the restored perspective frame into a spherical reference guide with a recorded camera. This deterministic projection only supplies geometry and does not add artwork.
4. Give imagegen the guide, restored frame, and proven panorama separately. Their roles are camera layout, primary scene details, and projection/style continuity respectively. Generate one continuous 2:1 panorama, not six independently drawn faces.
5. Check the matching forward view in the actual renderer, then side/rear/pole views. Establish one usable pilot before scaling the workflow. Retain failed candidates and record any additional repair honestly.
6. Derive six cube faces and a cubemap atlas from each selected assembled panorama with the projection CLI. Validate projection boundaries and inspect the artwork separately.
7. Integrate only assets that actually exist; pending or failed stops must never masquerade as completed viewpoints.

## Alignment acceptance

Compare raw video frame → restored frame → forward panorama at the same display aspect ratio. Look for changes in tractor position, silhouette, scale and horizon. Any registered source detail must use the correct rectangular perspective, never stretch 16:9 to a square. Inspect its perimeter for doubling and straight seams before accepting it.

The opening frame is a visual acceptance criterion, not something guaranteed by a prompt. Source-frame preservation can improve the transition; it does not prove that the independently inferred scenery behind the camera forms a measured reconstruction.

## Preservation

The source pack holds prompts, camera descriptors, input/output identities, scripts and review records. Heavy media stays on the mini's TB4 SSD in `shared/pinpin-tractor-stops-20260924/`, with a scoped verified archive. Browser review uses the existing mini mirror and SSH tunnel. No public reader deployment is implied.
