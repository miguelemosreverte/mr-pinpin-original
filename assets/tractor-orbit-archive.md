# Tractor orbit preservation

All **16 media / 60,293,137 bytes** are archived in public bucket `miguelemosreverte/mr-pinpin-archive`: the reviewed original starting still, untouched provider MP4, separate all-intra scrubbing MP4, seven timed keyframe PNGs, the primary contact sheet, a half-second thumbnail sheet and four exact endpoint diagnostic frames.

Every scoped manifest entry matches its remote receipt on path, role, byte count, SHA-256 and immutable object key. All entries have successful remote verification and independent anonymous GET/hash verification. The original provider video also matches the saved generation sidecar. Byte-range GET returned the exact first 1024 derivative bytes with HTTP 206; UI/visual review remains separate from archive correctness.

The existing asset catalog and HF adapter ran against regular files on the mini SSD. This scoped manifest assigns archive roles only; no global asset policy or published selection changed. All original files remain on the mini. Source media links are not a reason to commit binaries. No credentials, dotenv files or private session logs are included.

Evidence: `/Volumes/TB4/mac-mini-storage/shared/pinpin-tractor-orbit-20260924/{archive-inputs.json,archive-receipt.json,anonymous-verification.json,final-check.json}`. The source production pack also contains `final-check.json`, `PIPELINE.md`, exact settings/prompts, generation sidecars and derivative/frame metadata. The restore command is:

```sh
python3 tools/assets/hf_store.py pull --manifest assets/tractor-orbit.json --root /external/restored --cache /external/asset-cache --profile archive
```

The archive preserves this single authorized video trial. It does not certify rigid vehicle geometry, a perfect loop, or new rights in the material. No paid retry, upscale, source commit or official publication was performed by this lane.
