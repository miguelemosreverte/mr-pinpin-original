# Neighbor-Turn Boundary Review

2026-09-23. Four requested joins reviewed from decoded native and matte frames.
All three new clips/mattes are complete. No media repair or resampling performed.
External root: `/Volumes/TB4/mac-mini-storage/shared/atlas-neighbor-turn-20260923/`.

`heading015-reference-v01.png` is now present and visually inspected: more of
the face is visible as the intended rightward heading turns toward the viewer;
body and visible feet are fully framed, with cream fur and eye whites retained.
This is a usable nominal neighbor reference for the experiment, not geometric
proof of exactly 15 degrees.

## Current Acceptance And Scope

The user visually approved the current loop and perspective. This review does
not reopen that approval. Prior seam reports remain unchanged dated analysis.
The user explicitly discards matching gait throughout neighboring loops; no
same-phase, synchronized-contact, or equal-paw-pose acceptance gate applies.
Review only the actual joins, visible scale/framing, and new foot/matte artifacts.
No paid calls, atlas edits, extra angles, or commits by this lane.

## Findings

Both turn clips make a **nonmonotonic front-facing detour**. Outbound frames
roughly 8-18 face much more toward the viewer before returning to nominal 015.
Return frames roughly 5-16 initially turn farther toward the viewer, then turn
away toward right-facing 000. Independently inspected both all-25 dark contact
sheets. These are clear qualitative heading changes, not calibrated angle
measurements. They do not depict a simple monotonic neighboring-angle turn.

At the four actual 23->0 cuts, native/dark/green evidence shows no gross body
translation or scale jump, obvious missing/duplicated paw, or new conspicuous
white gap. Fine matte edges and physical contact are not certified. Modest
foot/appearance steps and speed changes remain; return->000 is the least settled
cut. This is usable boundary-demo evidence, not a blanket seamlessness approval.

| Real join (frame 23 -> 0) | Foreground alpha MAE /255 | Silhouette IoU | Native RGB MAE /255 | Visible assessment |
| --- | ---: | ---: | ---: | --- |
| 000 loop -> outbound | 5.632 | 0.9764 | 19.896 | Similar placement; forepaw finishes a step then turn starts nearly still |
| Outbound -> 015 loop | 5.223 | 0.9783 | 23.259 | Small local paw/head adjustment, no gross scale pop |
| 015 loop -> return | 3.932 | 0.9844 | 17.321 | Closest actual silhouette join; small paw changes remain |
| Return -> 000 loop | 8.526 | 0.9645 | 29.724 | Largest of four appearance/foot steps; visible final adjustment, not a body teleport |

Across those cuts, opaque silhouette area changes by +0.54%, -0.31%, -0.04%,
and +0.93%; centroid shifts are all under 1.8 native pixels. These are fixed
native-coordinate mask measurements, not fitted scale transforms. No image
alignment was applied. Bbox/centroid details and identities are in metrics.json.

Feet were measured separately in rear `[280,430,460,600)`, central
`[530,475,740,650)`, forward `[740,430,970,635)` native-pixel boxes. For
000->outbound the forward-region alpha step changes from 27.44 at the cut to
2.26 on the next frame; rear 10.59->1.99 and central 9.54->1.36 similarly slow.
Return->000 rear 24.43->6.05 and central 16.81->4.23 also ease sharply. These
support local motion discontinuity/near-hold observations, not frozen-frame or
physical foot-velocity claims. Boxes contain some body/fur; matte jitter and
occlusion limit anatomical conclusions. No throughout-loop phase gate was used.

## Separate Conditioning Evidence

Decoded frame 24 -> next clip frame 0 is closer than the actual selected joins:
alpha MAE 2.351 / 2.564 / 2.450 / 2.863 and IoU 0.9916 / 0.9909 / 0.9915 /
0.9898, in the same four-join order. Its native/dark contact sheet shows close
but nonidentical poses. This demonstrates approximate realized endpoint
conditioning, NOT the quality of playback cuts that omit frame 24. No hidden
extra hold, endpoint replacement, interpolation, or cadence change was used.

## Scheduler Contract For Dewey

- Steady loops have a 1-second period. Queue heading requests; the newest replaces
  the previous queued heading. Returning to the current heading cancels a stale turn.
- Start a ready requested turn at the next steady-loop boundary, never midway
  through a loop. A request while steadily looping waits at most one loop period
  before transition start under ready-media, normally advancing playback.
- Complete an active turn before starting another. Requests during a turn update
  the pending heading without interrupting or retargeting that active turn.
- At completion, establish the destination heading and allow a ready queued next
  turn immediately at that boundary. No compulsory destination loop is required.
  Do not replay stale commands or overlap active turns.
- The <=1s bound is steady-loop waiting time, NOT total arrival time. Transition
  duration, an already active turn, missing media, or paused playback are separate.
- Test latest-wins bursts, cancellation, just-before/after-boundary requests,
  requests during a turn, and completion without overlapping turns. Define event
  ordering for an exactly-on-boundary request so the result is deterministic.

Dewey owns `scripts/neighbor-turn-review/scheduler.js`; no competing module or
edits by this lane. Main is coordinating the immediate-completion-boundary rule
with Dewey. No callable built-in peer-messaging tool was available in this lane.

## Playback Timing Checkpoint

Main explicitly selected **frames 0-23 at 24fps, exactly 1 second, for ALL four
playback clips**, including turns. Realized joins are frame 23 -> frame 0.
Native frame 24 is retained only as separate endpoint-conditioning evidence;
it is not held for an extra 41.667ms. No stretching, resampling, or packing 25
frames into one second. This supersedes the earlier 25-frame-turn proposal.

## Evidence And Limits

All four windows were decoded and inspected:

| Join | Required local evidence |
| --- | --- |
| 000 loop -> outbound turn | Accepted 000 loop frames 22,23; outbound first 0,1 |
| Outbound turn -> 015 loop | Outbound 22,23; 015 loop 0,1 |
| 015 loop -> return turn | 015 loop 22,23; return 0,1 |
| Return turn -> 000 loop | Return 22,23; accepted 000 loop 0,1 |

External `boundary-audit-v01/` contains `metrics.json`, four correspondingly
named join PNGs with native/dark/green rows and enlarged foot strips, and
`conditioning-only-24-to-0.png`. The adjacent `boundary-audit.py` records the
read-only procedure and reuses the existing seam metrics helper. All native
timestamps were checked: 25 samples at 24fps from 0 to 1s. All inspected native
files and RGBA PNG hashes were verified unchanged before/after inspection.

Static boundary evidence does not certify real-time browser playback. Dewey
owns the scheduler/player demonstration and timing tests. Immediate turn->turn
chaining is permitted by policy but is a different pair of joins from these four
loop/turn cuts; it is not silently claimed as covered by this four-join audit.
No retry, interpolation, extra media variant, source-runtime edit, or commit.
