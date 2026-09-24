# Restore → panorama pilot

Exactly **two built-in image calls** were completed: one restoration and one spherical extension. No batch or repairs have been started. Literal reusable prompts, input/output identities and byte-preserving save guidance are in `pilot/`.

## Restoration

Input is unchanged video frame96 at4s (selected stop04), 1280×720, SHA-256 `a521421a10d6335ea01421245ec619175568aa8954d0715c1cd3d45b90141c15`. The sole-input restoration produced `pilot/restored-v1.png`, 1672×941, SHA-256 `f6a3e454f750b8b1e4c8425a43f7f438554cd126b90b30ba2f0314073539fda0`.

Visual comparison shows clearer tread, cab/glass, crane edges and foliage. Main wheel centers, crane pose and overall normalized composition remain close to the original. The sharp textures and small details are synthesized; this is not recovery of ground-truth detail from the blurry video. The coordinator inspected and accepted this restoration recipe provisionally for later batching.

## Spherical extension

The projection lane mapped the restored frame into a neutral 4096×2048 sphere using yaw0/pitch0, actual source aspect1672/941, authored vertical FOV45° and horizontal FOV72.70527373°. Its deterministic roundtrip retains the frame composition. These lens values are a chosen registration convention, not a measured video lens.

The generation received three separate ordered references: projected guide first, native restored frame second, accepted assembled tractor panorama third. The last supplies projection/scene context and must not override the new side view. Result `pilot/panorama-v1.png` is1774×887, SHA-256 `26b2c7875500c0c5c5a2c6b433ea7fbd77046a35f28f3086bd5acf7e5f9d7869`.

The output retains the side-on tractor, crane behind cab, empty tandem-axle trailer and forest setting. It fills the previously unknown sphere. However, flat inspection shows the vehicle enlarged relative to the projected core: the model did not obey exact placement/scale preservation. Therefore the unadjusted yaw0/pitch0/FOV45° result is **not accepted as registered**. Camera-fit and actual spherical review are pending with the projection/UI lanes; there is no basis yet to claim a smooth transition or a production-ready24-stop workflow.

The pilot is retained for that test. No local painting, core replacement, extra art call or runtime modification has been performed by this lane. Raw masters are durable on mini under `pinpin-tractor-stops-20260924/pilot/`; the tool returned PNG data URLs without a filesystem hint, decoded unchanged and saved overSSH. Source prompt/JSON files mirror those identities.

## Source fidelity and style review after user hold

Compared raw t4, native restoration and the projection lane’s fitted panorama view (`pilot/fit/fitted-view.png`). The raw video frame has coherent restrained side-profile proportions, though blurred. The restored version retains broad placement but introduces very crisp, evenly defined tread, fasteners, hoses and foliage with glossy metal shading; that can read as polished CG/product rendering rather than the softer original. The regeneration is therefore not a purely optical deblur or a pixel-preserving operation.

The panorama stage introduces a larger fidelity loss. It enlarges and redraws the vehicle, changes nearby trees/ground/sun treatment, and reduces the vehicle to a small part of a1774-wide whole sphere. C’s fitted view (yaw+3.171°,pitch+.217°,VFOV65.1134°) recovers central cab/crane scale only approximately; the outer wheels visibly stretch and positions/scenery differ. Zooming that sphere cannot recover the native restored detail. The forward image does not align1:1, and a camera fit is not a correction of model-generated shape differences.

Production is held. Preserve original raw frames as the authority and retain restoration/panorama as separate experiments. Do not describe this pilot as a source-faithful panorama solution or continue24 spherical regenerations on its strength. Seven previously authorized restoration-only batch calls had completed by the hold; they are frozen in `batches/00-07.md`, with no further calls or repairs.
