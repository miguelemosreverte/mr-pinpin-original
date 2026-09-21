# Camera and actor transform standard

Every newly rendered shot must persist this record before the exact prompt: shot purpose; frame ID; camera positionXYZ, targetXYZ, height, framing, approximate field-of-view, axis side; every present actor's positionXYZ, body-facing target, head-facing target, eye target, pose, visible limbs/contact/support and visibility; static landmarks; object state before/after; previous/next action and reason for shot change. Named targets must resolve to an actor or scene landmark, not “looks here.” Offscreen actors remain positioned explicitly.

World scale: one unit roughly PinPin standing height. Papa1.6, Mama1.5–1.6, dog shoulder2.7, infant0.5–0.6child body. Approximate illustrated ratios; reference and visible interaction govern, not pixel arithmetic. Camera at child's eye height about0.75; seated table positions use seats/support. Lens/FOV is an illustration cue, not calibrated EXIF.

Exterior local H/E frame: threshold=(0,0,0), +X to right in exterior master, +Y into home/tree, +Z up. Approach from negativeY; facade inX/Z plane. Home mountingstone=(-2,-2,0.35), bowl=(2,-2,0), chimneyfacade-left, lantern/knobfacade-right, doorhingesfacade-left. Camera baseline(0,-7,1.2) towardthreshold. Elder boulder/staff leftX; fern rightX; restpatch=(4,-1,0) beyondfern, never block door. Approximate landmarks are planning positions, preserve accepted plates over arbitrary numeric coordinates.

Kitchen K frame is oriented to reference interior: +X towardstove/right, +Y towardgreen-doorwall, +Zup, origin tablecenter. K axes rotate180degrees relative exterior (interior reverse view), so innerhingesright/knobleft. Mama seat=(-1.2,0,0), Papa=(0.7,0.8,0), PinPin=(0.9,-0.8,0), infant supported byMama. Tabletop aroundZ0.85; seat heights adjusted consistently. Windows flankdoor, cupboardsleft/stoveright; never mirror furniture to simplify reverse shots. Define dialogue axis between adult and child; use camera positions on one chosen side, crossing only through an establishing/neutral view.

Travel T frame: +Yforward alongpath, +Xright oftravel, +Zup, dogcenterorigin. Child seat just behindwithers, Papa immediatelybehind; Papa supports child's lower torso withoneforearm, otherpaw bracesback. A child-view camera may sit justbehindhead/shoulder and show Scoobyears/path; do not hallucinate an extra rider or lose contact when changing camera.

Coverage: establish place → reveal/reaction → interaction/detail → changed state. Repeat a view when it helps a precise physical step; otherwise choose a justified distance/angle/foreground change. Dense intermediate images are welcome for mounting/dismounting/discovery. No new image simply to demonstrate a rendering. Daytime family narrative and mature/child identities remain stable.

For inherited images, store observed framing/actor attention from reviewed pixels without inventing exact transforms or claiming a camera was generated with this new system.
